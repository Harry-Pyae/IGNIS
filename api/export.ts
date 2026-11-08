/** GET /api/export — the open dataset download (§8.1 item 6). Public, rate-limited, verified rows only (RLS). */
import { CatalogStatsSchema, ExperimentSchema } from '../src/lib/types.js';
import { anonClient } from '../src/server/db.js';
import { buildExport } from '../src/server/export.js';
import { apiError, rateLimit, route } from '../src/server/http.js';

export const GET = route(async (req) => {
  const limited = rateLimit(req, 'export', 10);
  if (limited) return limited;
  const db = anonClient();
  if (!db) return apiError(503, 'not_configured', 'Supabase is not configured on the server');

  // Anon role on purpose: RLS is what guarantees a draft can never be exported.
  const [rows, stats] = await Promise.all([db.from('experiments').select('*'), db.rpc('catalog_stats')]);
  if (rows.error || stats.error) return apiError(502, 'db_error', 'Could not load the verified catalog');
  const revision = CatalogStatsSchema.parse(stats.data).revision;
  const body = buildExport(
    rows.data.map((r) => ExperimentSchema.parse(r)),
    revision,
  );

  // Pretty-printed: people open this file. ~60 cards, so size doesn't matter.
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'content-disposition': `attachment; filename="ignis-catalog-${revision.slice(0, 8)}.json"`,
    },
  });
});
