/**
 * Round 3, item 2 (review §2B): rows and catalog_revision must describe ONE database snapshot.
 * The fake database applies a curator correction right after the rows statement and before the
 * next statement, which is the interleaving the review identified.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogChangingError, readConsistentSnapshot } from '../src/lib/snapshot';
import type { Experiment } from '../src/lib/types';
import { card, scenario } from './helpers';

const ID = '11111111-1111-4111-8111-111111111111';
const v1 = card({ id: ID, o2_pct: 21, updated_at: '2026-11-09T00:00:00Z' });
const v2 = card({ id: ID, o2_pct: 20, updated_at: '2026-11-09T00:05:00Z' }); // the correction

/** One verified card; `correctAfterRows` commits the correction right after the next rows read. */
function fakeDatabase() {
  const db = { version: 1, correctAfterRows: false, reads: [] as string[] };
  const rows = async () => {
    db.reads.push(`rows@v${db.version}`);
    const out = [db.version === 1 ? v1 : v2];
    if (db.correctAfterRows) {
      db.version = 2;
      db.correctAfterRows = false;
    }
    return out;
  };
  const revision = async () => {
    db.reads.push(`rev@v${db.version}`);
    return `rev-${db.version}`;
  };
  return { db, rows, revision };
}

describe('readConsistentSnapshot', () => {
  it('the hazard is real: a naive rows-then-revision read pairs OLD facts with the NEW revision', async () => {
    const { db, rows, revision } = fakeDatabase();
    db.correctAfterRows = true;
    const naive = { rows: await rows(), revision: await revision() };
    expect(naive).toEqual({ rows: [v1], revision: 'rev-2' }); // old o2 21 labeled rev-2
  });

  it('a correction between the reads is detected and re-read: new facts, new revision', async () => {
    const { db, rows, revision } = fakeDatabase();
    db.correctAfterRows = true;
    const snap = await readConsistentSnapshot(rows, revision);
    expect(snap).toEqual({ rows: [v2], revision: 'rev-2' });
    expect(db.reads).toEqual(['rev@v1', 'rows@v1', 'rev@v2', 'rev@v2', 'rows@v2', 'rev@v2']);
  });

  it('bounded: a catalog that keeps changing gives up with a retryable error', async () => {
    let n = 0;
    const read = readConsistentSnapshot(async () => [], async () => `rev-${n++}`, 3);
    await expect(read).rejects.toBeInstanceOf(CatalogChangingError);
    expect(n).toBe(6); // 3 attempts × (before + after)
  });
});

// ---------------------------------------------------------------------------
// The routes: synthesize must never cache old facts under the new revision; export must never
// label old rows with it.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  fake: null as null | ReturnType<typeof fakeDatabase>,
  cache: new Map<string, { briefing: unknown; catalog_revision: string }>(),
  completeJson: vi.fn(),
}));
vi.mock('../src/server/llm.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/server/llm')>()),
  completeJson: h.completeJson,
}));
vi.mock('../src/server/db.js', () => ({
  anonClient: () => ({
    from: () => ({ select: async () => ({ data: await h.fake!.rows(), error: null }) }),
    rpc: async () => ({
      data: { verified: 1, in_review: 0, campaigns: ['BASS'], last_updated: null, revision: await h.fake!.revision() },
      error: null,
    }),
  }),
  serviceClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_c: string, key: string) => ({
          maybeSingle: async () => ({ data: h.cache.get(key) ?? null, error: null }),
        }),
      }),
      upsert: async (row: { scenario_hash: string; briefing: unknown; catalog_revision: string }) => {
        h.cache.set(row.scenario_hash, { briefing: row.briefing, catalog_revision: row.catalog_revision });
        return { error: null };
      },
    }),
  }),
}));
const { POST: synthesize } = await import('../api/synthesize');
const { GET: exportCatalog } = await import('../api/export');

let ip = 0;
const headers = () => ({ 'content-type': 'application/json', 'x-forwarded-for': `10.7.0.${++ip}` });

beforeEach(() => {
  h.fake = fakeDatabase();
  h.cache.clear();
  // The "model" faithfully reports the O2 value of whatever card E1 it was shown.
  h.completeJson.mockReset().mockImplementation(async ({ user }: { user: string }) => {
    const o2 = Number(/"evidence_id":"E1".*?"o2_pct":([\d.]+)/.exec(user)![1]);
    return {
      provider: 'groq',
      data: {
        claims: [
          {
            classification: 'OBSERVED',
            text: `Sustained at ${o2}% O2.`,
            evidence_ids: ['E1'],
            refs: [
              { evidence_id: 'E1', field: 'outcome', value: 'sustained', unit: null },
              { evidence_id: 'E1', field: 'o2_pct', value: o2, unit: '%' },
            ],
            gap_ids: [],
          },
        ],
      },
    };
  });
});

const o2Of = (b: { claims: { refs: { field: string; value: unknown }[] }[] }) =>
  b.claims[0]!.refs.find((r) => r.field === 'o2_pct')!.value;

describe('POST /api/synthesize under a concurrent correction', () => {
  it('serves and caches the NEW facts under the new revision, never the old ones', async () => {
    h.fake!.db.correctAfterRows = true;
    const res = await synthesize(
      new Request('http://x/api/synthesize', { method: 'POST', headers: headers(), body: JSON.stringify({ scenario: scenario(), experiment_ids: [ID] }) }),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', catalog_revision: 'rev-2' });
    expect(o2Of(body)).toBe(20);

    const stored = [...h.cache.values()];
    expect(stored).toHaveLength(1);
    expect(stored[0]!.catalog_revision).toBe('rev-2');
    expect(o2Of(stored[0]!.briefing as Parameters<typeof o2Of>[0])).toBe(20); // never 21 under rev-2
  });

  it('a later request under the same revision hits a cache entry that holds the new facts', async () => {
    h.fake!.db.correctAfterRows = true;
    const call = () =>
      synthesize(
        new Request('http://x/api/synthesize', { method: 'POST', headers: headers(), body: JSON.stringify({ scenario: scenario(), experiment_ids: [ID] }) }),
      ).then((r) => r.json());
    await call();
    const again = await call();
    expect(again).toMatchObject({ provider: 'cache', catalog_revision: 'rev-2' });
    expect(o2Of(again)).toBe(20);
    expect(h.completeJson).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/export under a concurrent correction', () => {
  it('exports the corrected row under the revision it actually belongs to', async () => {
    h.fake!.db.correctAfterRows = true;
    const res = await exportCatalog(new Request('http://x/api/export', { headers: headers() }));
    const data = (await res.json()) as { catalog_revision: string; experiments: Experiment[] };
    expect(data.catalog_revision).toBe('rev-2');
    expect(data.experiments.map((e) => e.o2_pct)).toEqual([20]);
    expect(res.headers.get('content-disposition')).toContain('ignis-catalog-rev-2');
  });
});
