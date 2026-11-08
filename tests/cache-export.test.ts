/** Item 3: briefing cache on /api/synthesize, the export endpoint, and the §7.6 worked example. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sanitizeDraft } from '../src/lib/extract';
import { ExperimentSchema, ExtractDraftSchema } from '../src/lib/types';
import { buildExport, EXPORT_README } from '../src/server/export';
import { EXTRACT_EXAMPLE, EXTRACT_SYSTEM } from '../src/server/prompts';
import { card, scenario } from './helpers';

const h = vi.hoisted(() => ({
  rows: [] as unknown[],
  revision: 'rev-1',
  cache: new Map<string, unknown>(),
  completeJson: vi.fn(),
}));

vi.mock('../src/server/llm.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/server/llm')>()),
  completeJson: h.completeJson,
}));
vi.mock('../src/server/db.js', () => ({
  anonClient: () => ({
    from: () => ({ select: async () => ({ data: h.rows, error: null }) }),
    rpc: async () => ({
      data: { verified: h.rows.length, in_review: 0, campaigns: ['BASS'], last_updated: null, revision: h.revision },
      error: null,
    }),
  }),
  // Minimal briefings_cache fake: select().eq().maybeSingle() and upsert().
  serviceClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_col: string, key: string) => ({
          maybeSingle: async () => ({ data: h.cache.has(key) ? { briefing: h.cache.get(key) } : null, error: null }),
        }),
      }),
      upsert: async (row: { scenario_hash: string; briefing: unknown }) => {
        h.cache.set(row.scenario_hash, row.briefing);
        return { error: null };
      },
    }),
  }),
}));

const { POST: synthesize } = await import('../api/synthesize');
const { GET: exportCatalog } = await import('../api/export');

let ip = 0;
const req = (url: string, init: RequestInit = {}) =>
  new Request(url, { ...init, headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${++ip}` } });
const synth = (body: unknown) => synthesize(req('http://x/api/synthesize', { method: 'POST', body: JSON.stringify(body) }));

const e1 = card();
const observed = {
  provider: 'groq',
  data: {
    claims: [
      {
        classification: 'OBSERVED',
        text: 'GMT96-T7 sustained at 21% O2.',
        evidence_ids: ['E1'],
        refs: [
          { evidence_id: 'E1', field: 'outcome', value: 'sustained', unit: null },
          { evidence_id: 'E1', field: 'o2_pct', value: 21, unit: '%' },
        ],
        gap_ids: [],
      },
    ],
  },
};

beforeEach(() => {
  h.rows = [e1, card({ verified_by: null, test_id: 'DRAFT' })];
  h.revision = 'rev-1';
  h.cache.clear();
  h.completeJson.mockReset();
});

describe('briefing cache (/api/synthesize)', () => {
  const body = { scenario: scenario(), experiment_ids: [e1.id] };

  it('miss → live call + store; hit → served from cache without a provider call', async () => {
    h.completeJson.mockResolvedValue(observed);
    const first = await (await synth(body)).json();
    expect(first).toMatchObject({ status: 'ok', provider: 'groq' });
    expect(h.cache.size).toBe(1);

    const second = await (await synth(body)).json();
    expect(second).toMatchObject({ status: 'ok', provider: 'cache', claims: first.claims });
    expect(h.completeJson).toHaveBeenCalledTimes(1);
  });

  it('a new catalog_revision never serves the old briefing', async () => {
    h.completeJson.mockResolvedValue(observed);
    await synth(body);
    h.revision = 'rev-2';
    expect((await (await synth(body)).json()).provider).toBe('groq');
    expect(h.completeJson).toHaveBeenCalledTimes(2);
    expect(h.cache.size).toBe(2);
  });

  it('fallback briefings (provider outage) are never cached', async () => {
    h.completeJson.mockRejectedValue(new Error('down'));
    expect((await (await synth(body)).json()).status).toBe('fallback');
    expect(h.cache.size).toBe(0);
  });

  it('the gates still run before the cache', async () => {
    const same = card({ domain: 'smoke_detection', campaign: 'SAME' });
    h.rows = [e1, same];
    const res = await synth({ scenario: scenario(), experiment_ids: [same.id] });
    expect(res.status).toBe(400);
    expect(h.cache.size).toBe(0);
  });
});

describe('export (/api/export)', () => {
  it('verified cards only, with the README, as a download', async () => {
    const res = await exportCatalog(req('http://x/api/export'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="ignis-catalog-rev-1.json"');
    const data = await res.json();
    expect(data).toMatchObject({ format: 'ignis-catalog-v1', catalog_revision: 'rev-1', count: 1 });
    expect(data.experiments.map((e: { id: string }) => e.id)).toEqual([e1.id]);
    expect(data.readme.description).toMatch(/traceable, structured research catalog with NASA source provenance/);
  });

  it('README documents exactly the exported fields', () =>
    expect(Object.keys(EXPORT_README.fields).sort()).toEqual(Object.keys(ExperimentSchema.shape).sort()));

  it('stable order: campaign, then test_id', () => {
    const out = buildExport([card({ campaign: 'BASS-II', test_id: 'A' }), card({ test_id: 'Z' }), card({ test_id: 'B' })], 'r');
    expect(out.experiments.map((e) => `${e.campaign} ${e.test_id}`)).toEqual(['BASS B', 'BASS Z', 'BASS-II A']);
  });

  it('never claims "publication-ready" or anything forward-looking', () =>
    expect(JSON.stringify(EXPORT_README)).not.toMatch(/publication-ready|predict|will burn|would burn/i));
});

describe('§7.6 worked BASS example', () => {
  it('is a valid draft that survives the server sanitizer untouched', () => {
    const draft = ExtractDraftSchema.parse(EXTRACT_EXAMPLE.draft);
    const { draft: out, dropped } = sanitizeDraft(draft, EXTRACT_EXAMPLE.excerpt);
    expect(dropped).toEqual([]);
    expect(out).toEqual(draft);
  });
  it('shows the no-conversion and no-invented-provenance rules', () => {
    expect(EXTRACT_EXAMPLE.draft).toMatchObject({ pressure_kpa: null, source_page: null, spread_rate_mm_s: null });
    expect(EXTRACT_EXAMPLE.draft.field_quotes.pressure_kpa).toBe('Ambient pressure was 1 atm.');
    expect(EXTRACT_SYSTEM).toContain(EXTRACT_EXAMPLE.excerpt);
  });
});
