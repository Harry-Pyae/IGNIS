/**
 * The verified catalog as the PUBLIC role sees it (RLS: verified rows only), as one consistent
 * snapshot of rows + catalog_revision. Server-only; shared by /api/synthesize and /api/export.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { CatalogChangingError, readConsistentSnapshot } from '../lib/snapshot.js';
import { CatalogStatsSchema, type Experiment, ExperimentSchema } from '../lib/types.js';
import { apiError } from './http.js';

export type CatalogRead = { ok: true; catalog: Experiment[]; revision: string } | { ok: false; response: Response };

export async function readVerifiedCatalog(db: SupabaseClient): Promise<CatalogRead> {
  try {
    const { rows, revision } = await readConsistentSnapshot(
      async () => {
        const { data, error } = await db.from('experiments').select('*');
        if (error) throw error;
        return data as unknown[];
      },
      async () => {
        const { data, error } = await db.rpc('catalog_stats');
        if (error) throw error;
        return CatalogStatsSchema.parse(data).revision;
      },
    );
    return { ok: true, catalog: rows.map((r) => ExperimentSchema.parse(r)), revision };
  } catch (e) {
    if (e instanceof CatalogChangingError)
      return { ok: false, response: apiError(503, 'db_error', 'The verified catalog is being updated — try again in a moment') };
    return { ok: false, response: apiError(502, 'db_error', 'Could not load the verified catalog') };
  }
}
