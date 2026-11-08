import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { completeJson, LlmUnavailableError, providerOrder } from '../src/server/llm';

const schema = z.object({ ok: z.boolean() });
const req = { system: 'Return JSON', user: 'hi', schema, temperature: 0.2 };
const groqOk = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }));
const geminiOk = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
const env = { GROQ_API_KEY: 'g-secret', GEMINI_API_KEY: 'm-secret' };
const fake = (fn: (url: string) => Response) => (async (url: string) => fn(url)) as unknown as typeof fetch;
const rejection = <T>(p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('expected a rejection');
    },
    (e: unknown) => e as T,
  );

describe('providerOrder', () => {
  it('reads LLM_PROVIDER_ORDER, ignores junk, defaults to groq,gemini', () => {
    expect(providerOrder({ LLM_PROVIDER_ORDER: 'gemini, groq' })).toEqual(['gemini', 'groq']);
    expect(providerOrder({ LLM_PROVIDER_ORDER: 'openai' })).toEqual(['groq', 'gemini']);
    expect(providerOrder({})).toEqual(['groq', 'gemini']);
  });
});

describe('completeJson', () => {
  it('falls through to gemini on a groq 429', async () => {
    const hosts: string[] = [];
    const fetchFn = fake((url) => {
      hosts.push(new URL(url).host);
      return url.includes('groq') ? new Response('', { status: 429 }) : geminiOk('{"ok":true}');
    });
    expect(await completeJson(req, { env, fetchFn })).toEqual({ data: { ok: true }, provider: 'gemini' });
    expect(hosts).toEqual(['api.groq.com', 'generativelanguage.googleapis.com']);
  });

  it('applies the same Zod validation to both providers', async () => {
    const fetchFn = fake((url) => (url.includes('groq') ? groqOk('{"ok":"yes"}') : geminiOk('{"ok":"yes"}')));
    const err = await completeJson(req, { env, fetchFn }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmUnavailableError);
    expect((err as LlmUnavailableError).attempts).toMatchObject([
      { provider: 'groq', failure: 'zod_schema_on_200', status: 200 },
      { provider: 'gemini', failure: 'zod_schema_on_200', status: 200 },
    ]);
  });

  it('never leaks keys into errors', async () => {
    const err = await rejection<Error>(completeJson(req, { env, fetchFn: fake(() => new Response('', { status: 500 })) }));
    expect(err.message).not.toMatch(/secret/);
  });

  it('skips providers without keys', async () => {
    const err = await rejection<LlmUnavailableError>(completeJson(req, { env: {}, fetchFn: fake(() => groqOk('{"ok":true}')) }));
    expect(err.attempts).toEqual([
      { provider: 'groq', failure: 'env_var_missing', status: null, elapsed_ms: 0 },
      { provider: 'gemini', failure: 'env_var_missing', status: null, elapsed_ms: 0 },
    ]);
  });
});
