/**
 * POST /api/curate-write — the ONLY write path into experiments (§10). Curator-only, service role.
 *   save_draft: create/update a card with verified_by = null (invisible to the public).
 *               Saving a published card un-publishes it until someone re-verifies it.
 *   publish:    a named human reviewer verifies and publishes (placeholder names rejected).
 */
import { CurateWriteRequestSchema, ExperimentSchema } from '../src/lib/types.js';
import { verifierNameProblem } from '../src/lib/verifier.js';
import { serviceClient } from '../src/server/db.js';
import { apiError, json, readJson, requireCurator, route } from '../src/server/http.js';

export const POST = route(async (req) => {
  const denied = requireCurator(req);
  if (denied) return denied;
  const { data, response } = await readJson(req, CurateWriteRequestSchema);
  if (response) return response;
  const { record } = data;

  // Principle 4: SAME stays smoke_detection; FLEX/droplets are never carded.
  if (/^SAME\b/i.test(record.campaign) && record.domain !== 'smoke_detection')
    return apiError(400, 'invalid_request', 'SAME cards must use domain smoke_detection');
  if (/^FLEX\b/i.test(record.campaign)) return apiError(400, 'invalid_request', 'FLEX (droplet combustion) is out of scope and is never carded');

  let verified_by: string | null = null;
  if (data.action === 'publish') {
    const problem = verifierNameProblem(data.verified_by);
    if (problem) return apiError(400, 'invalid_request', problem, [{ path: 'verified_by', message: problem }]);
    verified_by = data.verified_by.trim();
  }

  const db = serviceClient();
  if (!db) return apiError(503, 'not_configured', 'Supabase service role is not configured on the server');
  const row = { ...record, verified_by, verified_at: verified_by ? new Date().toISOString() : null };
  const query = data.id ? db.from('experiments').update(row).eq('id', data.id) : db.from('experiments').insert(row);
  const { data: saved, error } = await query.select('*').maybeSingle();
  if (error?.code === '23505')
    return apiError(409, 'duplicate_experiment', 'This campaign and test ID already exist. Reopen the existing card and reconcile its sources; do not publish the same run twice.');
  if (error) return apiError(502, 'db_error', `Save failed: ${error.message}`);
  if (!saved) return apiError(404, 'not_found', 'No card with that id');
  return json({ experiment: ExperimentSchema.parse(saved) }, data.id ? 200 : 201);
});
