/** Round 3, item 1: the browser catalog loader and the four populations the console renders. */
import { describe, expect, it } from 'vitest';
import { evidenceViews } from '../src/engine/views';
import { fetchVerifiedCatalog } from '../src/lib/catalogData';
import { FIXTURES, SEED_CARDS } from '../src/lib/fixtures';
import type { Experiment } from '../src/lib/types';
import { card, scenario } from './helpers';

const ENV = { url: 'https://db.example', key: 'anon-key' };
const stats = (revision: string) => ({ verified: 1, in_review: 0, campaigns: ['BASS'], last_updated: null, revision });

/** A fake PostgREST: `rows` + `revisions` are consumed in call order; also records what was asked. */
function fakePostgrest(rows: unknown[][], revisions: string[], status = 200) {
  const calls: string[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${url.replace(ENV.url, '')} key=${(init?.headers as Record<string, string>).apikey}`);
    if (status !== 200) return new Response('{}', { status });
    const body = url.includes('/rpc/catalog_stats') ? stats(revisions.shift()!) : rows.shift();
    return new Response(JSON.stringify(body));
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

describe('fetchVerifiedCatalog (browser)', () => {
  it('not configured → explicit state, no request', async () =>
    expect(await fetchVerifiedCatalog(null)).toEqual({ state: 'unavailable', reason: 'not_configured' }));

  it('reads as anon, one snapshot: validated verified rows + their revision', async () => {
    const pg = fakePostgrest([[SEED_CARDS[0]]], ['rev-a', 'rev-a']);
    const out = await fetchVerifiedCatalog(ENV, pg.fetchFn);
    expect(out).toEqual({ state: 'ready', revision: 'rev-a', experiments: [SEED_CARDS[0]], invalid: 0 });
    expect(pg.calls).toEqual([
      'POST /rest/v1/rpc/catalog_stats key=anon-key',
      'GET /rest/v1/experiments?select=*&order=id.asc key=anon-key',
      'POST /rest/v1/rpc/catalog_stats key=anon-key',
    ]);
  });

  it('a row that fails validation (or is unverified) is left out and counted, never repaired', async () => {
    const broken = { ...SEED_CARDS[1], outcome: 'exploded' };
    const unverified = { ...SEED_CARDS[2], verified_by: null };
    const pg = fakePostgrest([[SEED_CARDS[0], broken, unverified]], ['r', 'r']);
    const out = await fetchVerifiedCatalog(ENV, pg.fetchFn);
    expect(out).toMatchObject({ state: 'ready', invalid: 2 });
    expect(out.state === 'ready' && out.experiments.map((e) => e.id)).toEqual([SEED_CARDS[0]!.id]);
  });

  it('zero verified rows → empty (with revision), never fixtures', async () => {
    const pg = fakePostgrest([[]], ['empty', 'empty']);
    expect(await fetchVerifiedCatalog(ENV, pg.fetchFn)).toEqual({ state: 'empty', revision: 'empty', invalid: 0 });
  });

  it('a curator publishing mid-read: re-read, return the newer snapshot', async () => {
    const pg = fakePostgrest([[], [SEED_CARDS[0]]], ['r1', 'r2', 'r2', 'r2']);
    expect(await fetchVerifiedCatalog(ENV, pg.fetchFn)).toMatchObject({ state: 'ready', revision: 'r2' });
  });

  it('keeps changing → "changing" (retryable); HTTP failure → "error" — both distinct from empty', async () => {
    const churn = fakePostgrest([[], [], []], ['1', '2', '3', '4', '5', '6']);
    expect(await fetchVerifiedCatalog(ENV, churn.fetchFn)).toEqual({ state: 'unavailable', reason: 'changing' });
    expect(await fetchVerifiedCatalog(ENV, fakePostgrest([], [], 503).fetchFn)).toEqual({ state: 'unavailable', reason: 'error' });
  });
});

describe('evidenceViews — all verified / eligible / plotted / top-k', () => {
  const same = card({ domain: 'smoke_detection', campaign: 'SAME', test_id: 'SAME-1' });
  const noFlow = card({ test_id: 'NO-FLOW', flow_cm_s: null });
  const pmma = card({ test_id: 'PMMA-1', fuel_material: 'PMMA', material_class: 'thermoplastic', fuel_form: 'flat_sheet' });
  const draft = card({ test_id: 'DRAFT', verified_by: null });
  const catalog: Experiment[] = [...SEED_CARDS, same, noFlow, pmma, draft];

  it('with a scenario: four distinct populations, SAME and drafts never eligible', () => {
    const v = evidenceViews(catalog, scenario(), 'rev', 2);
    expect(v.all_verified).toHaveLength(6); // 3 seeds + SAME + NO-FLOW + PMMA
    expect(v.eligible.map((e) => e.test_id)).toEqual(['BASS GMT96-T7', 'BASS GMT96-T8', 'BASS-II GMT45-T4', 'NO-FLOW']);
    expect(v.plotted).toHaveLength(3);
    expect(v.not_plotted).toEqual([{ experiment: noFlow, missing: ['flow_cm_s'] }]);
    expect(v.top_k).toHaveLength(2);
    expect(v.coverage?.catalog_revision).toBe('rev');
  });

  it('without a scenario: every solid card is eligible, no matches yet', () => {
    const v = evidenceViews(catalog, null, 'rev');
    expect(v.eligible).toHaveLength(5); // SAME excluded
    expect([v.top_k, v.coverage]).toEqual([[], null]);
  });

  it('no eligible rows: populations empty, coverage carries the approved absence gap', () => {
    const v = evidenceViews(SEED_CARDS, FIXTURES.noEligibleRows.scenario, 'fixture-rev');
    expect([v.eligible, v.plotted, v.top_k]).toEqual([[], [], []]);
    expect(v.coverage?.gaps[0]?.kind).toBe('no_eligible_evidence');
  });
});
