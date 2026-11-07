import { describe, expect, it } from 'vitest';
import type { Experiment } from '../src/lib/types';
import { buildContext, claimProblem, numbersIn, runClaimPipeline, type Generate } from '../src/server/claims';

const card = (over: Partial<Experiment>): Experiment => ({
  id: crypto.randomUUID(), created_at: '2026-11-07', domain: 'solid_flammability', campaign: 'BASS',
  test_id: 'BASS GMT96-T7', fuel_material: 'cotton_fiberglass', material_class: 'fabric', fuel_form: 'fabric',
  thickness_mm: 0.32, o2_pct: 21, flow_cm_s: 10, pressure_kpa: 101.325, ignition_method: null, outcome: 'sustained',
  spread_rate_mm_s: null, key_observation_quote: 'q', observation_summary: null, source_title: 't',
  source_url: 'https://ntrs.nasa.gov/citations/20150008962', psi_investigation: null, source_page: 3,
  source_figure: null, source_table: null, source_section: null, ntrs_id: null, doi: null, media_url: null,
  telemetry: null, verified_by: 'x', notes: null, ...over,
});

const ctx = buildContext([
  card({}),
  card({ test_id: 'BASS-II GMT45-T4', o2_pct: 18.7, flow_cm_s: 2.2, outcome: 'extinguished' }),
]);
const observed = { classification: 'OBSERVED' as const, text: 'GMT96-T7 sustained burning at 21% O2.', evidence_ids: ['E1'] };
const gen = (...responses: unknown[]): Generate => {
  let i = 0;
  return async () => {
    const r = responses[i++];
    if (r instanceof Error) throw r;
    return { data: r, provider: 'groq' };
  };
};

describe('numbersIn', () => {
  it('ignores identifiers like O2 / E3 and normalizes', () => {
    expect(numbersIn('at 21.0% O2 per E3 and 18.7')).toEqual(['21', '18.7']);
  });
});

describe('claimProblem', () => {
  it('accepts a cited claim using only card numbers', () => expect(claimProblem(observed, ctx)).toBeNull());
  it('rejects evidence ids outside the retrieved context', () =>
    expect(claimProblem({ ...observed, evidence_ids: ['E9'] }, ctx)).toBe('unknown_evidence_id'));
  it('rejects uncited OBSERVED/SUPPORTED claims', () =>
    expect(claimProblem({ ...observed, evidence_ids: [] }, ctx)).toBe('missing_evidence'));
  it('allows uncited UNTESTED claims', () =>
    expect(
      claimProblem({ classification: 'UNTESTED', text: 'No card reports pressure effects.', evidence_ids: [] }, ctx),
    ).toBeNull());
  it('rejects prediction wording', () =>
    expect(claimProblem({ ...observed, text: 'The panel would burn here.' }, ctx)).toBe('forbidden_wording'));
  it('rejects numbers absent from the cards', () =>
    expect(claimProblem({ ...observed, text: 'Burned at 25% O2.' }, ctx)).toBe('unsupported_number'));
});

describe('runClaimPipeline (§7.4)', () => {
  it('returns ok on a clean first attempt', async () => {
    const b = await runClaimPipeline(gen({ claims: [observed] }), ctx);
    expect(b).toMatchObject({ status: 'ok', withheld_count: 0, provider: 'groq' });
    expect(b.evidence.map((e) => e.evidence_id)).toEqual(['E1', 'E2']);
  });

  it('retries once at 0.1 and withholds claims that still fail', async () => {
    const temps: number[] = [];
    const bad = { ...observed, evidence_ids: ['E7'] };
    const generate: Generate = async (t) => {
      temps.push(t);
      return { data: { claims: [observed, bad] }, provider: 'gemini' };
    };
    const b = await runClaimPipeline(generate, ctx);
    expect(temps).toEqual([0.3, 0.1]);
    expect(b).toMatchObject({ status: 'ok', claims: [observed], withheld_count: 1 });
  });

  it('falls back when the shape is malformed twice', async () => {
    const b = await runClaimPipeline(gen({ nope: 1 }, { claims: [{ classification: 'GUESS' }] }), ctx);
    expect(b).toMatchObject({ status: 'fallback', claims: [], provider: null });
  });

  it('treats a provider outage as a failed attempt, not a crash', async () => {
    const b = await runClaimPipeline(gen(new Error('down'), { claims: [observed] }), ctx);
    expect(b.status).toBe('ok');
  });
});
