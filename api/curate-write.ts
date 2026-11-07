/** POST /api/curate-write — the ONLY write path into experiments (§10). Curator-only, service role. */
import { CurateWriteRequestSchema, ExperimentSchema } from '../src/lib/types.js';
import { serviceClient } from '../src/server/db.js';
import { apiError, json, readJson, requireCurator, route } from '../src/server/http.js';

export const POST = route(async (req) => {
  const denied = requireCurator(req);
  if (denied) return denied;
  const { data, response } = await readJson(req, CurateWriteRequestSchema);
  if (response) return response;

  // Principle 4: SAME stays smoke_detection; FLEX/droplets are never carded.
  if (/^SAME\b/i.test(data.campaign) && data.domain !== 'smoke_detection')
    return apiError(400, 'invalid_request', 'SAME cards must use domain smoke_detection');
  if (/^FLEX\b/i.test(data.campaign)) return apiError(400, 'invalid_request', 'FLEX (droplet combustion) is out of scope and is never carded');

  const db = serviceClient();
  if (!db) return apiError(503, 'not_configured', 'Supabase service role is not configured on the server');
  const { data: row, error } = await db.from('experiments').insert(data).select('*').single();
  if (error) return apiError(502, 'db_error', `Insert failed: ${error.message}`);
  return json({ experiment: ExperimentSchema.parse(row) }, 201);
});
