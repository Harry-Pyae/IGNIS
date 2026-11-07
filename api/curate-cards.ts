/**
 * GET /api/curate-cards        — list every card (drafts + published) for curators.
 * GET /api/curate-cards?id=… — one full card, to reopen it in /curate.
 * Curator-only (x-curator-secret). Service role: drafts are invisible to everyone else.
 */
import { ExperimentSchema } from '../src/lib/types.js';
import { serviceClient } from '../src/server/db.js';
import { apiError, json, requireCurator, route } from '../src/server/http.js';

export const GET = route(async (req) => {
  const denied = requireCurator(req);
  if (denied) return denied;
  const db = serviceClient();
  if (!db) return apiError(503, 'not_configured', 'Supabase service role is not configured on the server');

  const id = new URL(req.url).searchParams.get('id');
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return apiError(400, 'invalid_request', 'id must be a uuid');
    const { data, error } = await db.from('experiments').select('*').eq('id', id).maybeSingle();
    if (error) return apiError(502, 'db_error', 'Could not load the card');
    if (!data) return apiError(404, 'not_found', 'No card with that id');
    return json({ experiment: ExperimentSchema.parse(data) });
  }

  const { data, error } = await db
    .from('experiments')
    .select('id, campaign, test_id, source_title, verified_by, updated_at')
    .order('updated_at', { ascending: false });
  if (error) return apiError(502, 'db_error', 'Could not list cards');
  return json({
    items: data.map((r) => ({ ...r, status: r.verified_by ? 'published' : 'draft' })),
  });
});
