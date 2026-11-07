/** POST /api/synthesize — LLM Job B (§7.3) behind the §7.4 claim-validation pipeline. Public, rate-limited. */
import { ExperimentSchema, LlmBriefingSchema, SynthesizeRequestSchema } from '../src/lib/types.js';
import { buildContext, runClaimPipeline } from '../src/server/claims.js';
import { anonClient } from '../src/server/db.js';
import { apiError, json, rateLimit, readJson, route } from '../src/server/http.js';
import { completeJson } from '../src/server/llm.js';
import { SYNTHESIZE_SYSTEM } from '../src/server/prompts.js';

export const POST = route(async (req) => {
  const limited = rateLimit(req, 'synthesize', 10);
  if (limited) return limited;
  const { data, response } = await readJson(req, SynthesizeRequestSchema);
  if (response) return response;

  const db = anonClient();
  if (!db) return apiError(503, 'not_configured', 'Supabase is not configured on the server');

  // Re-read the cited cards server-side as the PUBLIC role: RLS guarantees only
  // verified rows, and the client can never inject its own "evidence".
  const { data: rows, error } = await db.from('experiments').select('*').in('id', data.experiment_ids);
  if (error) return apiError(502, 'db_error', 'Could not load evidence');
  const byId = new Map(rows.map((r) => [r.id as string, ExperimentSchema.parse(r)]));
  const experiments = data.experiment_ids.flatMap((id) => byId.get(id) ?? []);
  if (experiments.length === 0) return apiError(400, 'invalid_request', 'None of the experiment_ids are verified cards');

  // TODO(part2): read/write briefings_cache by scenario hash before calling the model.
  const ctx = buildContext(experiments);
  const user = `SCENARIO:\n${JSON.stringify(data.scenario)}\n\nCARDS:\n${ctx.text}`;
  const briefing = await runClaimPipeline(
    (temperature) => completeJson({ system: SYNTHESIZE_SYSTEM, user, schema: LlmBriefingSchema, temperature }),
    ctx,
  );
  return json(briefing);
});
