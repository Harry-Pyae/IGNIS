import { describe, expect, it } from 'vitest';
import { computeCoverage } from '../src/lib/coverage';
import type { Claim } from '../src/lib/types';
import { buildContext, claimProblem, renderObserved, runClaimPipeline, type Generate } from '../src/server/claims';
import { card, scenario, t4 } from './helpers';

// E1 = GMT96-T7 (21% O2, 10 cm/s, sustained) · E2 = GMT45-T4 (18.7%, flow 10→2.2, extinguished)
const cards = [card(), t4()];
// Scenario pressure 200 kPa is outside the catalog (only 101.325) → coverage gap G1.
const coverage = computeCoverage(scenario({ pressure_kpa: 200 }), cards, cards, 'rev-1');
const ctx = buildContext(cards, coverage);

const o2 = (id: string, v: number) => ({ evidence_id: id, field: 'o2_pct' as const, value: v, unit: '%' });
const flow = (id: string, v: number) => ({ evidence_id: id, field: 'flow_cm_s' as const, value: v, unit: 'cm/s' });
const outcome = (id: string, v: string) => ({ evidence_id: id, field: 'outcome' as const, value: v, unit: null });
const observed = (text: string, refs: Claim['refs'], evidence_ids = ['E1']): Claim => ({
  classification: 'OBSERVED',
  text,
  evidence_ids,
  refs,
  gap_ids: [],
});

const accurate = observed('GMT96-T7 sustained burning at 21% O2 in 10 cm/s flow.', [
  outcome('E1', 'sustained'),
  o2('E1', 21),
  flow('E1', 10),
]);

describe('A3 probe 1 — wrong outcome cited to the right card', () => {
  it('rejects an outcome word with no outcome ref', () =>
    expect(claimProblem(observed('GMT96-T7 extinguished at 21% O2.', [o2('E1', 21)]), ctx)).toBe('unsupported_outcome'));
  it('rejects an outcome ref that contradicts the card', () =>
    expect(
      claimProblem(observed('GMT96-T7 extinguished at 21% O2.', [o2('E1', 21), outcome('E1', 'extinguished')]), ctx),
    ).toBe('ref_mismatch'));
});

describe('A3 probe 2 — number borrowed from an uncited card', () => {
  it('rejects 18.7 (E2) attributed to E1', () =>
    expect(claimProblem(observed('GMT96-T7 burned at 18.7% O2.', [o2('E1', 18.7)]), ctx)).toBe('ref_mismatch'));
  it('rejects a ref to a card the claim does not cite', () =>
    expect(claimProblem(observed('GMT96-T7 burned at 18.7% O2.', [o2('E2', 18.7)]), ctx)).toBe('ref_not_cited'));
  it('rejects a number in the text that no ref backs', () =>
    expect(claimProblem(observed('GMT96-T7 burned at 18.7% O2.', [o2('E1', 21)]), ctx)).toBe('unsupported_number'));
});

describe('A3 probe 3 — right number, wrong field/unit', () => {
  it('rejects 21 (an O2 %) written as a spread rate in mm/s', () =>
    expect(claimProblem(observed('Spread rate was 21 mm/s.', [o2('E1', 21)]), ctx)).toBe('unit_mismatch'));
  it('rejects a spread-rate ref the card does not report', () =>
    expect(
      claimProblem(
        observed('Spread rate was 21 mm/s.', [{ evidence_id: 'E1', field: 'spread_rate_mm_s', value: 21, unit: 'mm/s' }]),
        ctx,
      ),
    ).toBe('ref_mismatch'));
  it('rejects a ref with the wrong unit', () =>
    expect(claimProblem(observed('Oxygen was 21.', [{ ...o2('E1', 21), unit: 'kPa' }]), ctx)).toBe('unit_mismatch'));
});

describe('A3 probe 4 — future-behavior phrasing', () => {
  for (const text of [
    'At 21% O2 the flame will spread.',
    'The panel would burn at 21% O2.',
    'Flames are expected to spread at 21% O2.',
    'IGNIS predicts sustained burning at 21% O2.',
  ])
    it(`rejects: ${text}`, () => expect(claimProblem(observed(text, [o2('E1', 21)]), ctx)).toBe('forbidden_wording'));
});

describe('accurate claims are accepted', () => {
  it('OBSERVED with matching refs', () => expect(claimProblem(accurate, ctx)).toBeNull());
  it('SUPPORTED across two cited cards', () =>
    expect(
      claimProblem(
        {
          classification: 'SUPPORTED',
          text: 'Across the two tests, the run held at 2.2 cm/s extinguished while the 10 cm/s run was sustained.',
          evidence_ids: ['E1', 'E2'],
          refs: [flow('E2', 2.2), outcome('E2', 'extinguished'), flow('E1', 10), outcome('E1', 'sustained')],
          gap_ids: [],
        },
        ctx,
      ),
    ).toBeNull());
  it('ignores digits inside cited test ids', () =>
    expect(claimProblem(observed('BASS-II GMT45-T4 quenched.', [outcome('E2', 'extinguished')], ['E2']), ctx)).toBeNull());
});

describe('UNTESTED claims only point at server gap ids', () => {
  const untested = (gap_ids: string[]): Claim => ({
    classification: 'UNTESTED',
    text: 'No pressure evidence.',
    evidence_ids: [],
    refs: [],
    gap_ids,
  });
  it('rejects an invented gap', () => expect(claimProblem(untested(['G9']), ctx)).toBe('unknown_gap'));
  it('rejects an uncited absence claim', () => expect(claimProblem(untested([]), ctx)).toBe('missing_gap'));
  it('accepts a supplied gap', () => expect(claimProblem(untested(['G1']), ctx)).toBeNull());
});

describe('other structural rules', () => {
  it('rejects uncited OBSERVED', () => expect(claimProblem(observed('Burned.', [], []), ctx)).toBe('missing_evidence'));
  it('rejects OBSERVED without refs', () => expect(claimProblem(observed('Burned.', []), ctx)).toBe('missing_refs'));
  it('rejects unknown evidence ids', () => expect(claimProblem(observed('x', [o2('E1', 21)], ['E9']), ctx)).toBe('unknown_evidence_id'));
});

describe('deterministic rendering', () => {
  it('renders OBSERVED from refs and keeps the changing-flow qualifier', () => {
    const text = renderObserved([flow('E2', 2.2), outcome('E2', 'extinguished')], ctx);
    expect(text).toBe(
      'BASS-II GMT45-T4: Airflow 2.2 cm/s, outcome extinguished (Airflow changed 10 → 2.2 cm/s during the run: reduced after ignition, then held (p.5)).',
    );
  });
});

describe('runClaimPipeline (§7.4)', () => {
  const gen = (...responses: unknown[]): Generate => {
    let i = 0;
    return async () => {
      const r = responses[i++];
      if (r instanceof Error) throw r;
      return { data: r, provider: 'groq' };
    };
  };

  it('returns ok, discards model prose for OBSERVED, renders UNTESTED from coverage', async () => {
    const b = await runClaimPipeline(
      gen({ claims: [{ ...accurate, text: 'GMT96-T7 sustained at 21% O2 in 10 cm/s flow (model wording).' }, { classification: 'UNTESTED', text: 'whatever', evidence_ids: [], refs: [], gap_ids: ['G1'] }] }),
      ctx,
    );
    expect(b).toMatchObject({ status: 'ok', withheld_count: 0, provider: 'groq', catalog_revision: 'rev-1' });
    expect(b.claims[0]!.text).toBe('BASS GMT96-T7: outcome sustained, Oxygen 21 %, Airflow 10 cm/s.');
    expect(b.claims[1]!.text).toBe(coverage.gaps[0]!.message);
  });

  it('retries once at 0.1 and withholds claims that still fail', async () => {
    const temps: number[] = [];
    const bad = observed('GMT96-T7 extinguished.', [outcome('E1', 'extinguished')]);
    const generate: Generate = async (t) => {
      temps.push(t);
      return { data: { claims: [accurate, bad] }, provider: 'gemini' };
    };
    const b = await runClaimPipeline(generate, ctx);
    expect(temps).toEqual([0.3, 0.1]);
    expect(b).toMatchObject({ status: 'ok', withheld_count: 1 });
    expect(b.claims).toHaveLength(1);
  });

  it('total provider failure → deterministic evidence-only fallback', async () => {
    const b = await runClaimPipeline(gen(new Error('down'), new Error('down')), ctx);
    expect(b).toMatchObject({ status: 'fallback', provider: null, withheld_count: 0 });
    expect(b.claims.map((c) => c.classification)).toEqual(['OBSERVED', 'OBSERVED']);
    expect(b.claims.every((c) => claimProblem(c, ctx) === null)).toBe(true);
  });

  it('falls back when the shape is malformed twice', async () => {
    const b = await runClaimPipeline(gen({ nope: 1 }, { claims: [{ classification: 'GUESS' }] }), ctx);
    expect(b.status).toBe('fallback');
  });
});
