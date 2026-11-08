/**
 * briefings_cache read/write (§13 demo resilience). Server-only: anon has no access to the
 * table (0001 RLS + revokes), so this uses the service-role client.
 *
 * Identity = briefingCacheKey(): prompt version + validator version + catalog_revision + ids +
 * scenario. Correcting or unpublishing any verified card changes the revision, so stale
 * briefings are simply never looked up again.
 * Only status 'ok' briefings are stored: a fallback caused by a provider outage must not stick.
 * Cache failures never fail the request — they just mean a live LLM call.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { type Briefing, BriefingSchema } from '../lib/types.js';

export async function readCachedBriefing(db: SupabaseClient | null, key: string, revision: string): Promise<Briefing | null> {
  if (!db) return null;
  try {
    const { data, error } = await db.from('briefings_cache').select('briefing').eq('scenario_hash', key).maybeSingle();
    if (error || !data) return null;
    const parsed = BriefingSchema.safeParse(data.briefing);
    // Belt and braces: the key already contains the revision.
    if (!parsed.success || parsed.data.catalog_revision !== revision || parsed.data.status !== 'ok') return null;
    return { ...parsed.data, provider: 'cache' };
  } catch {
    return null;
  }
}

export async function writeCachedBriefing(db: SupabaseClient | null, key: string, briefing: Briefing): Promise<void> {
  if (!db || briefing.status !== 'ok') return;
  try {
    const { error } = await db
      .from('briefings_cache')
      .upsert({ scenario_hash: key, briefing, catalog_revision: briefing.catalog_revision }, { onConflict: 'scenario_hash' });
    if (error) console.error('[cache] write failed:', error.message);
  } catch (e) {
    console.error('[cache] write failed:', e instanceof Error ? e.message : 'unknown error');
  }
}
