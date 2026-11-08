import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requireCurator } from '../src/server/http';
import { rateLimit } from '../src/server/rateLimit';

const reqFrom = (ip: string, headers: Record<string, string> = {}) =>
  new Request('http://x/api', { headers: { 'x-forwarded-for': ip, ...headers } });

type Rpc = (fn: string, args: Record<string, unknown>) => { abortSignal: () => Promise<{ data: unknown; error: unknown }> };
const fakeDb = (rpc: Rpc) => ({ rpc }) as unknown as SupabaseClient;
const reply = (data: unknown, error: unknown = null) => fakeDb(() => ({ abortSignal: async () => ({ data, error }) }));

describe('rateLimit (shared Postgres counter, fails open)', () => {
  it('allowed → null; over the limit → 429 with retry-after', async () => {
    expect(await rateLimit(reqFrom('1.1.1.1'), 't', 3, 60_000, reply({ allowed: true, retry_after_s: 40 }))).toBeNull();
    const res = await rateLimit(reqFrom('1.1.1.1'), 't', 3, 60_000, reply({ allowed: false, retry_after_s: 40 }));
    expect(res?.status).toBe(429);
    expect(res?.headers.get('retry-after')).toBe('40');
    expect((await res!.json()).error.code).toBe('rate_limited');
  });

  it('sends a hashed key (never the raw IP), the limit and the window in seconds', async () => {
    let args: Record<string, unknown> = {};
    const db = fakeDb((fn, a) => {
      expect(fn).toBe('rate_limit_hit');
      args = a;
      return { abortSignal: async () => ({ data: { allowed: true }, error: null }) };
    });
    await rateLimit(reqFrom('203.0.113.7'), 'parse-scenario', 20, 60_000, db);
    expect(args).toMatchObject({ p_limit: 20, p_window_s: 60 });
    expect(args.p_key).toMatch(/^[0-9a-f]{64}$/);
    expect(String(args.p_key)).not.toContain('203.0.113.7');
  });

  it.each([
    ['no service client', null],
    ['DB error (e.g. migration not applied)', reply(null, { message: 'function rate_limit_hit does not exist' })],
    ['malformed reply', reply({ nope: 1 })],
    ['timeout / network', fakeDb(() => ({ abortSignal: () => Promise.reject(new DOMException('t', 'TimeoutError')) }))],
  ] as const)('fails OPEN on %s', async (_label, db) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await rateLimit(reqFrom('1.1.1.1'), 't', 3, 60_000, db)).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('requireCurator', () => {
  const saved = process.env.CURATOR_SECRET;
  beforeEach(() => {
    delete process.env.CURATOR_SECRET;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.CURATOR_SECRET;
    else process.env.CURATOR_SECRET = saved;
  });
  it('503s when the secret is not configured', () => expect(requireCurator(reqFrom('x'))?.status).toBe(503));
  it('401s on a wrong secret and passes the right one', () => {
    process.env.CURATOR_SECRET = 's3cret';
    expect(requireCurator(reqFrom('x', { 'x-curator-secret': 'nope' }))?.status).toBe(401);
    expect(requireCurator(reqFrom('x', { 'x-curator-secret': 's3cret' }))).toBeNull();
  });
});
