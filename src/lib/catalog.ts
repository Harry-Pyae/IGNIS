/**
 * Public catalog summary (provenance strip + landing Catalog block). OWNER: Part 1.
 * Reads the counts-only SQL function catalog_stats() — drafts stay private, but the UI can
 * honestly say "N cards in review".
 *
 * Landing-page budget: one plain fetch to the PostgREST RPC endpoint, no supabase-js and no
 * Zod on this path (they cost ~150 KB of parse time before first paint on slow phones).
 * The shape check below mirrors CatalogStatsSchema in types.ts.
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

const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
function asStats(d: unknown): CatalogStats | null {
  const s = d as Partial<CatalogStats> | null;
  if (!s || !isCount(s.verified) || !isCount(s.in_review) || typeof s.revision !== 'string') return null;
  if (!Array.isArray(s.campaigns) || !s.campaigns.every((c) => typeof c === 'string')) return null;
  if (s.last_updated !== null && typeof s.last_updated !== 'string') return null;
  return s as CatalogStats;
}

async function load(): Promise<CatalogSummary> {
  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_ANON_KEY;
  if (!url || !key) return { state: 'unavailable', reason: 'not_configured' };
  try {
    const res = await fetch(`${url}/rest/v1/rpc/catalog_stats`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: '{}',
    });
    const stats = res.ok ? asStats(await res.json()) : null;
    return stats ? { state: 'ready', stats } : { state: 'unavailable', reason: 'error' };
  } catch {
    // Network down, CORS, DNS…
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
