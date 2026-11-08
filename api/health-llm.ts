/**
 * GET /api/health-llm — curator-only LLM diagnostics (useful on demo day).
 * Reports, per provider: key present? key accepted + model known? status + elapsed ms.
 * Plus which deployment answered, and env var NAMES that look like typos of ours
 * (e.g. VITE_GROQ_API_KEY). Never returns a value of any env var, a key, or a prompt.
 *
 * ?groq_model=…&gemini_model=… tries a candidate model for THIS probe only (no deploy needed
 * to test a replacement). Production traffic keeps using GROQ_MODEL / GEMINI_MODEL / defaults.
 */
import { json, requireCurator, route } from '../src/server/http.js';
import { rateLimit } from '../src/server/rateLimit.js';
import { LLM_ENV_VARS, probeProviders, providerOrder } from '../src/server/llm.js';

const EXPECTED = new Set<string>(LLM_ENV_VARS);
/** Names (only) of env vars that mention a provider but aren't a name the code reads. */
const misnamedVars = (env: NodeJS.ProcessEnv) =>
  Object.keys(env)
    .filter((k) => /GROQ|GEMINI|LLM_PROVIDER/i.test(k) && !EXPECTED.has(k))
    .sort();

export const GET = route(async (req) => {
  const denied = requireCurator(req);
  if (denied) return denied; // before ANY probe or env read
  const limited = await rateLimit(req, 'health-llm', 10);
  if (limited) return limited;

  const q = new URL(req.url).searchParams;
  const candidate = (name: string) => {
    const v = q.get(name);
    return v && /^[\w./:-]{1,80}$/.test(v) ? v : undefined;
  };
  const env = process.env;
  const probeEnv = { ...env, GROQ_MODEL: candidate('groq_model') ?? env.GROQ_MODEL, GEMINI_MODEL: candidate('gemini_model') ?? env.GEMINI_MODEL };
  return json({
    deployment: { env: env.VERCEL_ENV ?? 'local', commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null },
    provider_order: providerOrder(env),
    vars_present: Object.fromEntries(LLM_ENV_VARS.map((k) => [k, Boolean(env[k]?.trim())])),
    misnamed_vars: misnamedVars(env),
    providers: await probeProviders({ env: probeEnv }),
  });
});
