/**
 * One LLM interface over Groq (primary) and Gemini (failover) — §3.
 * Identical prompts and identical Zod validation on both; provider order from
 * LLM_PROVIDER_ORDER; falls through on error / timeout / 429 / bad JSON.
 * Keys are read server-side only and never logged: failure records carry provider, failure
 * class, HTTP status and elapsed ms — never key material, prompts or response contents.
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

/**
 * Why one provider failed. env_var_missing fails BEFORE any network call (fix: set the var,
 * then redeploy); every other class is a real provider response or a transport failure.
 */
export type FailureClass =
  | 'env_var_missing'
  | 'auth_401_403'
  | 'rate_limit_429'
  | 'http_other' // any other non-2xx: 400/404 (e.g. a retired model), 5xx
  | 'timeout'
  | 'network'
  | 'invalid_json_on_200' // 2xx but no parseable JSON text
  | 'zod_schema_on_200'; // 2xx + JSON, but it fails the route's schema

/** Safe to log and to show a curator. */
export interface Attempt {
  provider: ProviderName;
  failure: FailureClass;
  status: number | null;
  elapsed_ms: number;
}

export class LlmUnavailableError extends Error {
  constructor(readonly attempts: Attempt[]) {
    super(`All LLM providers failed: ${attempts.map((a) => `${a.provider}=${a.failure}`).join(', ') || 'none configured'}`);
  }
}

class ProviderError extends Error {
  constructor(
    readonly failure: FailureClass,
    readonly status: number | null,
  ) {
    super(failure);
  }
}

const httpFailure = (status: number): FailureClass =>
  status === 401 || status === 403 ? 'auth_401_403' : status === 429 ? 'rate_limit_429' : 'http_other';

type Env = Record<string, string | undefined>;
type Call = (key: string, model: string, req: LlmRequest<unknown>, fetchFn: typeof fetch) => Promise<string>;

const CONFIG: Record<
  ProviderName,
  { keyVar: string; modelVar: string; defaultModel: string; modelUrl: (m: string) => string; auth: (k: string) => Record<string, string>; call: Call }
> = {
  groq: {
    keyVar: 'GROQ_API_KEY',
    modelVar: 'GROQ_MODEL',
    defaultModel: 'llama-3.3-70b-versatile',
    modelUrl: (m) => `https://api.groq.com/openai/v1/models/${encodeURIComponent(m)}`,
    auth: (key) => ({ authorization: `Bearer ${key}` }),
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
      if (!res.ok) throw new ProviderError(httpFailure(res.status), res.status);
      const body = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content;
      if (!text) throw new ProviderError('invalid_json_on_200', res.status);
      return text;
    },
  },
  gemini: {
    keyVar: 'GEMINI_API_KEY',
    modelVar: 'GEMINI_MODEL',
    defaultModel: 'gemini-2.5-flash',
    modelUrl: (m) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}`,
    // Header, not ?key= — keeps the key out of URLs and any request logs.
    auth: (key) => ({ 'x-goog-api-key': key }),
    call: async (key, model, req, fetchFn) => {
      const res = await fetchFn(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: req.system }] },
            contents: [{ role: 'user', parts: [{ text: req.user }] }],
            generationConfig: { temperature: req.temperature, responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(req.timeoutMs ?? 20_000),
        },
      );
      if (!res.ok) throw new ProviderError(httpFailure(res.status), res.status);
      const body = (await res.json().catch(() => ({}))) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new ProviderError('invalid_json_on_200', res.status);
      return text;
    },
  },
};

export function providerOrder(env: Env = process.env): ProviderName[] {
  const wanted = (env.LLM_PROVIDER_ORDER ?? 'groq,gemini').split(',').map((s) => s.trim().toLowerCase());
  const order = wanted.filter((p): p is ProviderName => PROVIDERS.includes(p as ProviderName));
  return [...new Set(order.length ? order : PROVIDERS)];
}

function failureOf(e: unknown): { failure: FailureClass; status: number | null } {
  if (e instanceof ProviderError) return { failure: e.failure, status: e.status };
  if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) return { failure: 'timeout', status: null };
  if (e instanceof SyntaxError) return { failure: 'invalid_json_on_200', status: 200 };
  return { failure: 'network', status: null };
}

/** Dashboard-pasted values often carry a trailing newline or space. */
const readVar = (env: Env, name: string) => env[name]?.trim() || null;
const modelOf = (env: Env, p: ProviderName) => readVar(env, CONFIG[p].modelVar) ?? CONFIG[p].defaultModel;

/** One JSON line per provider failure, so Vercel function logs show the cause. */
const logFailure = (a: Attempt) => console.error(JSON.stringify({ event: 'llm_provider_failure', ...a }));

export async function completeJson<T>(
  req: LlmRequest<T>,
  deps: { env?: Env; fetchFn?: typeof fetch; only?: ProviderName } = {},
): Promise<LlmResult<T>> {
  const env = deps.env ?? process.env;
  const fetchFn = deps.fetchFn ?? fetch;
  const attempts: Attempt[] = [];
  for (const provider of deps.only ? [deps.only] : providerOrder(env)) {
    const key = readVar(env, CONFIG[provider].keyVar);
    const started = Date.now();
    let attempt: Attempt;
    if (!key) attempt = { provider, failure: 'env_var_missing', status: null, elapsed_ms: 0 };
    else
      try {
        const text = await CONFIG[provider].call(key, modelOf(env, provider), req as LlmRequest<unknown>, fetchFn);
        const parsed = req.schema.safeParse(JSON.parse(text));
        if (parsed.success) return { data: parsed.data, provider };
        attempt = { provider, failure: 'zod_schema_on_200', status: 200, elapsed_ms: Date.now() - started };
      } catch (e) {
        attempt = { provider, ...failureOf(e), elapsed_ms: Date.now() - started };
      }
    logFailure(attempt);
    attempts.push(attempt);
  }
  throw new LlmUnavailableError(attempts);
}

// ---------------------------------------------------------------------------
// Health probe (/api/health-llm). Asks each provider's model-metadata endpoint whether it
// accepts the key and knows the model — no tokens spent, no prompt sent.
// ---------------------------------------------------------------------------
export interface ProviderHealth {
  provider: ProviderName;
  /** The key var is present (non-blank). Its value is never echoed. */
  configured: boolean;
  /** The provider accepted the key and knows the model. */
  reachable: boolean;
  status: number | null;
  elapsed_ms: number;
  /** Model id in use (not secret): a retired model shows up as http_other / 404. */
  model: string;
  failure: FailureClass | null;
}

export async function probeProviders(
  deps: { env?: Env; fetchFn?: typeof fetch; timeoutMs?: number } = {},
): Promise<ProviderHealth[]> {
  const env = deps.env ?? process.env;
  const fetchFn = deps.fetchFn ?? fetch;
  return Promise.all(
    PROVIDERS.map(async (provider): Promise<ProviderHealth> => {
      const cfg = CONFIG[provider];
      const model = modelOf(env, provider);
      const key = readVar(env, cfg.keyVar);
      if (!key)
        return { provider, configured: false, reachable: false, status: null, elapsed_ms: 0, model, failure: 'env_var_missing' };
      const started = Date.now();
      try {
        const res = await fetchFn(cfg.modelUrl(model), { headers: cfg.auth(key), signal: AbortSignal.timeout(deps.timeoutMs ?? 5_000) });
        const failure = res.ok ? null : httpFailure(res.status);
        return { provider, configured: true, reachable: res.ok, status: res.status, elapsed_ms: Date.now() - started, model, failure };
      } catch (e) {
        return { provider, configured: true, reachable: false, ...failureOf(e), elapsed_ms: Date.now() - started, model };
      }
    }),
  );
}

/** Every env name the LLM layer reads — health-llm reports presence only. */
export const LLM_ENV_VARS = ['GROQ_API_KEY', 'GEMINI_API_KEY', 'LLM_PROVIDER_ORDER', 'GROQ_MODEL', 'GEMINI_MODEL'] as const;
