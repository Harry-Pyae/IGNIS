/**
 * Public catalog summary (provenance strip + landing Catalog block). OWNER: Part 1.
 * Reads the counts-only SQL function catalog_stats() — drafts stay private, but the UI can
 * honestly say "N cards in review". Supabase + Zod load lazily, off the LCP path.
 *
 * States are distinct on purpose:
 *   loading · unavailable (not configured | request failed → offer retry) · ready (may be empty)
 */
import { useCallback, useEffect, useState } from 'react';
import { COPY } from './copy';
import type { CatalogStats } from './types';

export type CatalogSummary =
  | { state: 'loading' }
  | { state: 'unavailable'; reason: 'not_configured' | 'error' }
  | { state: 'ready'; stats: CatalogStats };

async function load(): Promise<CatalogSummary> {
  try {
    const [{ supabase }, { CatalogStatsSchema }] = await Promise.all([import('./supabase'), import('./types')]);
    if (!supabase) return { state: 'unavailable', reason: 'not_configured' };
    const { data, error } = await supabase.rpc('catalog_stats');
    if (error) return { state: 'unavailable', reason: 'error' };
    const parsed = CatalogStatsSchema.safeParse(data);
    return parsed.success ? { state: 'ready', stats: parsed.data } : { state: 'unavailable', reason: 'error' };
  } catch {
    // Chunk failed to load, client threw during init, network down…
    return { state: 'unavailable', reason: 'error' };
  }
}

// One request shared by every component on the page.
let pending: Promise<CatalogSummary> | null = null;
const loadOnce = (force: boolean) => (pending = !pending || force ? load() : pending);

export function useCatalogSummary(): { summary: CatalogSummary; retry: () => void } {
  const [summary, setSummary] = useState<CatalogSummary>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    loadOnce(attempt > 0).then((s) => alive && setSummary(s));
    return () => {
      alive = false;
    };
  }, [attempt]);
  const retry = useCallback(() => {
    setSummary({ state: 'loading' });
    setAttempt((a) => a + 1);
  }, []);
  return { summary, retry };
}

/** Short status text. `compact` is the mobile form. */
export function catalogLine(summary: CatalogSummary, compact = false): string {
  if (summary.state === 'loading') return compact ? 'Loading…' : 'Loading verified catalog…';
  if (summary.state === 'unavailable')
    return summary.reason === 'not_configured' ? 'Catalog not connected' : 'Catalog unavailable';
  const { verified, in_review, campaigns } = summary.stats;
  if (verified > 0)
    return compact
      ? `${verified} verified · ${campaigns.length} campaigns`
      : `${verified} verified experiments · ${campaigns.length} NASA campaign${campaigns.length === 1 ? '' : 's'} · NTRS / PSI`;
  if (in_review > 0) return compact ? `In review · ${in_review}` : COPY.inReview(in_review);
  return 'Catalog empty — no verified experiments yet';
}
