/** /api/health-llm + the curator-gated debug detail on llm_unavailable 502s. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SECRET = 'curator-secret-for-tests';
const KEY = 'gsk_SUPERSECRET_value';
let ip = 0;
const get = (headers: Record<string, string> = {}) =>
  new Request('http://x/api/health-llm', { headers: { 'x-forwarded-for': `10.9.0.${++ip}`, ...headers } });
const parse = (headers: Record<string, string> = {}) =>
  new Request('http://x/api/parse-scenario', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.1.${++ip}`, ...headers },
    body: JSON.stringify({ text: 'cotton fabric at 21% oxygen' }),
  });

const { GET: health } = await import('../api/health-llm');
const { POST: parseScenario } = await import('../api/parse-scenario');

beforeEach(() => {
  vi.stubEnv('CURATOR_SECRET', SECRET);
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', ''); // no limiter round-trip to a real database from unit tests
  vi.stubEnv('GROQ_API_KEY', KEY);
  vi.stubEnv('GEMINI_API_KEY', '');
  vi.stubEnv('VITE_GEMINI_API_KEY', 'AIza_ALSO_SECRET'); // the classic misname
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GET /api/health-llm', () => {
  it('cannot be reached without the curator secret — and probes nothing', async () => {
    for (const h of [{}, { 'x-curator-secret': 'wrong' }] as Record<string, string>[]) expect((await health(get(h))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports presence, reachability and misnamed vars — never a value', async () => {
    const res = await health(get({ 'x-curator-secret': SECRET }));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toMatch(/SUPERSECRET|ALSO_SECRET|curator-secret-for-tests/);
    const body = JSON.parse(text);
    expect(body.vars_present).toMatchObject({ GROQ_API_KEY: true, GEMINI_API_KEY: false });
    expect(body.misnamed_vars).toEqual(['VITE_GEMINI_API_KEY']);
    expect(body.provider_order).toEqual(['groq', 'gemini']);
    expect(body.providers).toMatchObject([
      { provider: 'groq', configured: true, reachable: false, status: 401, failure: 'auth_401_403' },
      { provider: 'gemini', configured: false, reachable: false, failure: 'env_var_missing' },
    ]);
  });
});

describe('GET /api/health-llm?groq_model=…', () => {
  const probe = async (query: string) =>
    (await (await health(new Request(`http://x/api/health-llm${query}`, { headers: { 'x-curator-secret': SECRET, 'x-forwarded-for': `10.9.2.${++ip}` } }))).json())
      .providers[0].model;
  it('tries a candidate model for this probe only', async () => expect(await probe('?groq_model=qwen/qwen3.8-27b')).toBe('qwen/qwen3.8-27b'));
  it('ignores junk', async () => expect(await probe('?groq_model=%3Cscript%3E')).toBe('openai/gpt-oss-120b'));
});

describe('llm_unavailable 502 debug detail', () => {
  it('plain 502 for the public, even with the debug header alone', async () => {
    for (const h of [{}, { 'x-ignis-debug': '1' }, { 'x-ignis-debug': '1', 'x-curator-secret': 'wrong' }] as Record<string, string>[]) {
      const body = await (await parseScenario(parse(h))).json();
      expect(body.error.code).toBe('llm_unavailable');
      expect(body.error).not.toHaveProperty('providers_tried');
    }
  });

  it('providers_tried with debug flag + curator secret, still without key material', async () => {
    const res = await parseScenario(parse({ 'x-ignis-debug': '1', 'x-curator-secret': SECRET }));
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(text).not.toMatch(/SUPERSECRET|cotton fabric/);
    expect(JSON.parse(text).error.providers_tried).toMatchObject([
      { provider: 'groq', failure: 'auth_401_403', status: 401 },
      { provider: 'gemini', failure: 'env_var_missing', status: null },
    ]);
  });
});
