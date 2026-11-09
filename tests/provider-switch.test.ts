/**
 * Curator-only failover rehearsal switch (x-ignis-provider). Honored on parse-scenario and synthesize
 * ONLY with a valid curator secret; otherwise ignored and never mentioned. Forced synthesize requests
 * bypass the briefing cache entirely: no read, no write.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BriefingSchema, ParseScenarioResponseSchema } from '../src/lib/types';
import { card, scenario } from './helpers';

const SECRET = 'curator-secret-for-switch-tests';
const e1 = card();

const h = vi.hoisted(() => ({
  completeJson: vi.fn(),
  cache: new Map<string, unknown>(),
  reads: 0,
  writes: 0,
}));

vi.mock('../src/server/llm.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/server/llm')>()),
  completeJson: h.completeJson,
}));
vi.mock('../src/server/db.js', () => ({
  anonClient: () => ({
    from: () => ({ select: async () => ({ data: [e1], error: null }) }),
    rpc: async () => ({ data: { verified: 1, in_review: 0, campaigns: ['BASS'], last_updated: null, revision: 'rev-1' }, error: null }),
  }),
  // The briefing cache, counting every read and write. (No rpc → the rate limiter fails open, as designed.)
  serviceClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_c: string, key: string) => ({
          maybeSingle: async () => {
            h.reads++;
            return { data: h.cache.has(key) ? { briefing: h.cache.get(key) } : null, error: null };
          },
        }),
      }),
      upsert: async (row: { scenario_hash: string; briefing: unknown }) => {
        h.writes++;
        h.cache.set(row.scenario_hash, row.briefing);
        return { error: null };
      },
    }),
  }),
}));

const { POST: parse } = await import('../api/parse-scenario');
const { POST: synthesize } = await import('../api/synthesize');

let ip = 0;
const req = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://x${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.8.0.${++ip}`, ...headers },
    body: JSON.stringify(body),
  });
const FORCE_GEMINI = { 'x-ignis-provider': 'gemini', 'x-curator-secret': SECRET };
const parseBody = { text: 'PMMA panel at 21% oxygen, 10 cm/s airflow' };
const synthBody = { scenario: scenario(), experiment_ids: [e1.id] };
const onlyOf = (call: number) => (h.completeJson.mock.calls[call]![1] as { only?: string } | undefined)?.only;

beforeEach(() => {
  vi.stubEnv('CURATOR_SECRET', SECRET);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  h.cache.clear();
  h.reads = 0;
  h.writes = 0;
  // A provider that answers as whichever provider it was forced to (Groq when not forced).
  h.completeJson.mockReset().mockImplementation(async (r: { user: string }, deps?: { only?: 'groq' | 'gemini' }) => {
    const provider = deps?.only ?? 'groq';
    if (!r.user.startsWith('SCENARIO:'))
      return {
        provider,
        data: { domain: 'solid_flammability', fuel_material_raw: 'PMMA panel', fuel_form: 'flat_sheet', thickness_mm: null, o2_pct: 21, flow_cm_s: 10, pressure_kpa: null },
      };
    return {
      provider,
      data: {
        claims: [
          {
            classification: 'OBSERVED',
            text: 'Sustained at 21% O2.',
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
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('x-ignis-provider without a valid curator secret: ignored, never mentioned', () => {
  it.each([
    ['header alone', { 'x-ignis-provider': 'gemini' }],
    ['wrong secret', { 'x-ignis-provider': 'gemini', 'x-curator-secret': 'nope' }],
    ['junk value, no secret', { 'x-ignis-provider': 'openai' }],
  ])('parse-scenario, %s → normal order, normal response', async (_l, headers) => {
    const res = await parse(req('/api/parse-scenario', parseBody, headers));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(text).provider).toBe('groq');
    expect(onlyOf(0)).toBeUndefined();
    expect(text).not.toMatch(/x-ignis-provider|forced|rehears/i);
  });

  it('even when every provider fails, the public 502 never mentions the switch', async () => {
    const { LlmUnavailableError } = await import('../src/server/llm');
    h.completeJson.mockRejectedValue(new LlmUnavailableError([{ provider: 'groq', failure: 'timeout', status: null, elapsed_ms: 9 }]));
    const res = await parse(req('/api/parse-scenario', parseBody, { 'x-ignis-provider': 'gemini' }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toMatch(/x-ignis-provider|forced|gemini/i);
  });

  it('synthesize, header alone → normal cached path', async () => {
    const res = await synthesize(req('/api/synthesize', synthBody, { 'x-ignis-provider': 'gemini' }));
    expect((await res.json()).provider).toBe('groq');
    expect([h.reads, h.writes]).toEqual([1, 1]);
  });
});

describe('with the curator secret: the forced provider is used, and reported', () => {
  it('parse-scenario → only gemini is tried; response says gemini and passes the response schema', async () => {
    const res = await parse(req('/api/parse-scenario', parseBody, FORCE_GEMINI));
    const body = await res.json();
    expect(onlyOf(0)).toBe('gemini');
    expect(ParseScenarioResponseSchema.parse(body)).toMatchObject({ provider: 'gemini', scenario: { o2_pct: 21, flow_cm_s: 10 } });
  });

  it('a value other than groq/gemini → 400, visible to the curator only', async () => {
    const res = await parse(req('/api/parse-scenario', parseBody, { 'x-ignis-provider': 'openai', 'x-curator-secret': SECRET }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toMatch(/x-ignis-provider must be groq or gemini/);
    expect(h.completeJson).not.toHaveBeenCalled();
  });
});

describe('forced synthesize bypasses the briefing cache entirely', () => {
  it('forced gemini: validated briefing from gemini; NO cache read, NO cache write', async () => {
    const res = await synthesize(req('/api/synthesize', synthBody, FORCE_GEMINI));
    const body = BriefingSchema.parse(await res.json());
    expect(body).toMatchObject({ status: 'ok', provider: 'gemini', withheld_count: 0 });
    expect(onlyOf(0)).toBe('gemini');
    expect([h.reads, h.writes, h.cache.size]).toEqual([0, 0, 0]);
  });

  it('forced gemini run, then the same scenario unforced → cache miss, fresh Groq result (stored once)', async () => {
    await synthesize(req('/api/synthesize', synthBody, FORCE_GEMINI));
    const res = await synthesize(req('/api/synthesize', synthBody));
    const body = await res.json();
    expect(body.provider).toBe('groq'); // fresh, not a replay of the gemini briefing
    expect([h.reads, h.writes]).toEqual([1, 1]); // the unforced read missed, then stored the Groq result
    expect(h.completeJson).toHaveBeenCalledTimes(2);
    expect(onlyOf(1)).toBeUndefined();
  });

  it('an existing public cache entry is never served to a forced request', async () => {
    await synthesize(req('/api/synthesize', synthBody)); // public: stored under the normal key
    const res = await synthesize(req('/api/synthesize', synthBody, FORCE_GEMINI));
    expect((await res.json()).provider).toBe('gemini'); // a real gemini run, not 'cache'
    expect([h.reads, h.writes]).toEqual([1, 1]); // the forced run added neither
  });
});
