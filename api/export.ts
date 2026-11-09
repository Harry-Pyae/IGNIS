/** GET /api/export — the open dataset download (§8.1 item 6). Public, rate-limited, verified rows only (RLS). */
import { readVerifiedCatalog } from '../src/server/catalog.js';
import { anonClient } from '../src/server/db.js';
import { buildExport } from '../src/server/export.js';
import { apiError, route } from '../src/server/http.js';
import { rateLimit } from '../src/server/rateLimit.js';

export const GET = route(async (req) => {
  const limited = await rateLimit(req, 'export', 10);
  if (limited) return limited;
  const db = anonClient();
  if (!db) return apiError(503, 'not_configured', 'Supabase is not configured on the server');

  // Anon role on purpose: RLS is what guarantees a draft can never be exported.
  // One snapshot: the exported rows are exactly the revision named in the file.
  const read = await readVerifiedCatalog(db);
  if (!read.ok) return read.response;
  const { catalog, revision } = read;
  const body = buildExport(catalog, revision);

  // Pretty-printed: people open this file. ~60 cards, so size doesn't matter.
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'content-disposition': `attachment; filename="ignis-catalog-${revision.slice(0, 8)}.json"`,
    },
  });
});
