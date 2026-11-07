/**
 * One LLM interface over Groq (primary) and Gemini (failover) — §3.
 * Identical prompts and identical Zod validation on both; provider order from
 * LLM_PROVIDER_ORDER; falls through on error / timeout / 429 / bad JSON.
 * Keys are read server-side only and never logged (errors carry provider + reason only).
 * This is an ops detail, not a feature: never pitch "multi-AI".
 */
import type { z } from 'zod';

export type ProviderName = 'groq' | 'gemini';
const PROVIDERS: ProviderName[] = ['groq', 'gemini'];

export interface LlmRequest<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  /** 0.2 extraction · 0.3 synthesis · 0.1 validation retry (§3). */
  temperature: number;
  timeoutMs?: number;
}

export interface LlmResult<T> {
  data: T;
  provider: ProviderName;
}

export interface Attempt {
  provider: ProviderName;
  reason: string;
}

export class LlmUnavailableError extends Error {
  constructor(readonly attempts: Attempt[]) {
    super(`All LLM providers failed: ${attempts.map((a) => `${a.provider}=${a.reason}`).join(', ') || 'none configured'}`);
  }
}

class ProviderError extends Error {}

type Env = Record<string, string | undefined>;
type Call = (key: string, model: string, req: LlmRequest<unknown>, fetchFn: typeof fetch) => Promise<string>;

const CONFIG: Record<ProviderName, { keyVar: string; modelVar: string; defaultModel: string; call: Call }> = {
  groq: {
    keyVar: 'GROQ_API_KEY',
    modelVar: 'GROQ_MODEL',
    defaultModel: 'llama-3.3-70b-versatile',
    call: async (key, model, req, fetchFn) => {
      const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: req.temperature,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.user },
          ],
        }),
        signal: AbortSignal.timeout(req.timeoutMs ?? 20_000),
      });
      if (!res.ok) throw new ProviderError(`http_${res.status}`);
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content;
      if (!text) throw new ProviderError('empty_response');
      return text;
    },
  },
  gemini: {
    keyVar: 'GEMINI_API_KEY',
    modelVar: 'GEMINI_MODEL',
    defaultModel: 'gemini-2.5-flash',
    call: async (key, model, req, fetchFn) => {
      const res = await fetchFn(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          // Header, not ?key= — keeps the key out of URLs and any request logs.
          headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: req.system }] },
            contents: [{ role: 'user', parts: [{ text: req.user }] }],
            generationConfig: { temperature: req.temperature, responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(req.timeoutMs ?? 20_000),
        },
      );
      if (!res.ok) throw new ProviderError(`http_${res.status}`);
      const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new ProviderError('empty_response');
      return text;
    },
  },
};

export function providerOrder(env: Env = process.env): ProviderName[] {
  const wanted = (env.LLM_PROVIDER_ORDER ?? 'groq,gemini').split(',').map((s) => s.trim().toLowerCase());
  const order = wanted.filter((p): p is ProviderName => PROVIDERS.includes(p as ProviderName));
  return [...new Set(order.length ? order : PROVIDERS)];
}

function reasonOf(e: unknown): string {
  if (e instanceof ProviderError) return e.message;
  if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) return 'timeout';
  if (e instanceof SyntaxError) return 'invalid_json';
  return 'network_error';
}

export async function completeJson<T>(
  req: LlmRequest<T>,
  deps: { env?: Env; fetchFn?: typeof fetch; only?: ProviderName } = {},
): Promise<LlmResult<T>> {
  const env = deps.env ?? process.env;
  const fetchFn = deps.fetchFn ?? fetch;
  const attempts: Attempt[] = [];
  for (const provider of deps.only ? [deps.only] : providerOrder(env)) {
    const cfg = CONFIG[provider];
    const key = env[cfg.keyVar];
    if (!key) {
      attempts.push({ provider, reason: 'no_key' });
      continue;
    }
    try {
      const text = await cfg.call(key, env[cfg.modelVar] || cfg.defaultModel, req as LlmRequest<unknown>, fetchFn);
      const parsed = req.schema.safeParse(JSON.parse(text));
      if (!parsed.success) throw new ProviderError('schema_mismatch');
      return { data: parsed.data, provider };
    } catch (e) {
      attempts.push({ provider, reason: reasonOf(e) });
    }
  }
  throw new LlmUnavailableError(attempts);
}
