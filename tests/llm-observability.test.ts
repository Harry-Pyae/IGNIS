/** The adapter never fails silently, and its diagnostics never leak keys or prompts. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { completeJson, LlmUnavailableError, probeProviders } from '../src/server/llm';

const KEY = 'gsk_SUPERSECRET_should_never_appear';
const PROMPT = 'TOP-SECRET-PROMPT-TEXT';
const req = { system: PROMPT, user: PROMPT, schema: z.object({ ok: z.boolean() }), temperature: 0.2 };
const fake = (fn: (url: string) => Response | Promise<Response>) => (async (url: string) => fn(url)) as unknown as typeof fetch;
const failOf = (p: Promise<unknown>) => p.then(() => null, (e: LlmUnavailableError) => e.attempts);

let logs: string[] = [];
beforeEach(() => {
  logs = [];
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void logs.push(a.join(' ')));
});
afterEach(() => vi.restoreAllMocks());

describe('failure classes', () => {
  it('env var unset fails before any network call — distinct from a provider rejection', async () => {
    const fetchFn = vi.fn();
    const attempts = await failOf(completeJson(req, { env: { GROQ_API_KEY: '  \n' }, fetchFn: fetchFn as unknown as typeof fetch }));
    expect(fetchFn).not.toHaveBeenCalled();
    expect(attempts!.map((a) => a.failure)).toEqual(['env_var_missing', 'env_var_missing']);
  });

  it.each([
    [401, 'auth_401_403'],
    [403, 'auth_401_403'],
    [429, 'rate_limit_429'],
    [404, 'http_other'],
    [500, 'http_other'],
  ] as const)('HTTP %i → %s, with the status', async (status, failure) => {
    const attempts = await failOf(completeJson(req, { env: { GROQ_API_KEY: KEY }, only: 'groq', fetchFn: fake(() => new Response('', { status })) }));
    expect(attempts![0]).toMatchObject({ provider: 'groq', failure, status });
    expect(attempts![0]!.elapsed_ms).toBeGreaterThanOrEqual(0);
  });

  it('timeout, network, and bad JSON on a 200', async () => {
    const run = (fetchFn: typeof fetch) => failOf(completeJson(req, { env: { GROQ_API_KEY: KEY }, only: 'groq', fetchFn }));
    expect((await run(fake(() => Promise.reject(new DOMException('t', 'TimeoutError')))))![0]!.failure).toBe('timeout');
    expect((await run(fake(() => Promise.reject(new TypeError('fetch failed')))))![0]!.failure).toBe('network');
    const notJson = fake(() => new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }] })));
    expect((await run(notJson))![0]).toMatchObject({ failure: 'invalid_json_on_200', status: 200 });
  });

  it('trims a pasted key before using it', async () => {
    let auth = '';
    const fetchFn = (async (_u: string, init: RequestInit) => {
      auth = (init.headers as Record<string, string>).authorization!;
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }));
    }) as unknown as typeof fetch;
    await completeJson(req, { env: { GROQ_API_KEY: `${KEY}\n` }, only: 'groq', fetchFn });
    expect(auth).toBe(`Bearer ${KEY}`);
  });
});

describe('logging', () => {
  it('one JSON line per provider failure, without keys or prompt contents', async () => {
    await failOf(completeJson(req, { env: { GROQ_API_KEY: KEY }, fetchFn: fake(() => new Response('nope', { status: 401 })) }));
    expect(logs).toHaveLength(2);
    expect(logs.map((l) => JSON.parse(l))).toEqual([
      expect.objectContaining({ event: 'llm_provider_failure', provider: 'groq', failure: 'auth_401_403', status: 401 }),
      expect.objectContaining({ event: 'llm_provider_failure', provider: 'gemini', failure: 'env_var_missing', status: null }),
    ]);
    expect(logs.join('\n')).not.toMatch(/SUPERSECRET|TOP-SECRET/);
  });
});

describe('probeProviders', () => {
  it('configured / reachable / status / model, and never the key', async () => {
    const urls: string[] = [];
    const health = await probeProviders({
      env: { GROQ_API_KEY: KEY },
      fetchFn: fake((u) => {
        urls.push(u);
        return new Response('', { status: 404 });
      }),
    });
    expect(health).toEqual([
      { provider: 'groq', configured: true, reachable: false, status: 404, elapsed_ms: expect.any(Number), model: 'llama-3.3-70b-versatile', failure: 'http_other' },
      { provider: 'gemini', configured: false, reachable: false, status: null, elapsed_ms: 0, model: 'gemini-2.5-flash', failure: 'env_var_missing' },
    ]);
    expect(urls).toEqual(['https://api.groq.com/openai/v1/models/llama-3.3-70b-versatile']); // metadata only, no completion
    expect(JSON.stringify(health)).not.toContain('SUPERSECRET');
  });
});
