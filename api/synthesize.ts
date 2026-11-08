/** POST /api/synthesize — LLM Job B (§7.3) behind gates (A4) and claim validation (§7.4, A3). Public, rate-limited. */
import { CatalogStatsSchema, ExperimentSchema, LlmBriefingSchema, SynthesizeRequestSchema } from '../src/lib/types.js';
import { readCachedBriefing, writeCachedBriefing } from '../src/server/briefingCache.js';
import { briefingCacheKey } from '../src/server/cacheKey.js';
import { runClaimPipeline } from '../src/server/claims.js';
import { anonClient, serviceClient } from '../src/server/db.js';
import { apiError, json, rateLimit, readJson, route } from '../src/server/http.js';
import { completeJson } from '../src/server/llm.js';
import { SYNTHESIZE_SYSTEM } from '../src/server/prompts.js';
import { prepareSynthesis } from '../src/server/synthesis.js';

export const POST = route(async (req) => {
  const limited = rateLimit(req, 'synthesize', 10);
  if (limited) return limited;
  const { data, response } = await readJson(req, SynthesizeRequestSchema);
  if (response) return response;

  const db = anonClient();
  if (!db) return apiError(503, 'not_configured', 'Supabase is not configured on the server');

  // Read the catalog as the PUBLIC role: RLS guarantees verified rows only, and the client
  // can never inject its own "evidence". ≤ ~60 rows, so the full catalog is cheap.
  const [rows, stats] = await Promise.all([db.from('experiments').select('*'), db.rpc('catalog_stats')]);
  if (rows.error || stats.error) return apiError(502, 'db_error', 'Could not load the verified catalog');
  const catalog = rows.data.map((r) => ExperimentSchema.parse(r));
  const revision = CatalogStatsSchema.parse(stats.data).revision;

  // Gates + coverage BEFORE any provider call.
  const prepared = prepareSynthesis(data.scenario, data.experiment_ids, catalog, revision);
  if (!prepared.ok) return apiError(prepared.status, prepared.code, prepared.message, prepared.issues);

  // Cache AFTER the gates: a cached briefing is only served for evidence that is still verified + eligible.
  const cacheDb = serviceClient();
  const key = briefingCacheKey({ scenario: data.scenario, experiment_ids: data.experiment_ids, catalog_revision: revision });
  const cached = await readCachedBriefing(cacheDb, key, revision);
  if (cached) return json(cached);

  const user = `SCENARIO:\n${JSON.stringify(data.scenario)}\n\n${prepared.ctx.text}`;
  const briefing = await runClaimPipeline(
    (temperature) =>
      completeJson({ system: SYNTHESIZE_SYSTEM, user, schema: LlmBriefingSchema, temperature, timeoutMs: 9_000 }),
    prepared.ctx,
  );
  await writeCachedBriefing(cacheDb, key, briefing);
  return json(briefing);
});
