/**
 * Client catalog integration. OWNER: Coder A.
 *
 *  • useCatalogSummary(): counts only, from catalog_stats() (provenance strip + landing block).
 *    Drafts stay private, but the UI can honestly say "N cards in review".
 *  • useVerifiedCatalog(): the validated verified Experiment[] that feeds the engine's retrieve(),
 *    loaded lazily when the console asks for it, as ONE consistent snapshot with its revision.
 *
 * Landing-page budget: the summary is one plain fetch to the PostgREST RPC endpoint, with no
 * supabase-js and no Zod on this path (they cost ~150 KB of parse time before first paint on slow
 * phones). The row loader, which does need Zod, lives in ./catalogData and is imported on demand.
 *
 * One owner per resource (round 3, item 3): each is a module-level store read through React's
 * useSyncExternalStore, so every component sees the same state, retry updates all of them
 * together, and a slow superseded request can never overwrite a newer result.
 *
 * States are distinct on purpose:
 *   summary:  loading · unavailable (not configured | request failed → retry) · ready (may be zero)
 *   catalog:  loading · unavailable (not configured | error | changing → retry) · empty · ready
 */
import { useSyncExternalStore } from 'react';
import { COPY } from './copy';
import type { CatalogStats, Experiment } from './types';

export type CatalogSummary =
  | { state: 'loading' }
  | { state: 'unavailable'; reason: 'not_configured' | 'error' }
  | { state: 'ready'; stats: CatalogStats };

/** The verified rows + the revision they belong to. `invalid` = rows that failed validation and were left out. */
export type VerifiedCatalog =
  | { state: 'loading' }
  | { state: 'unavailable'; reason: 'not_configured' | 'error' | 'changing' }
  | { state: 'empty'; revision: string; invalid: number }
  | { state: 'ready'; revision: string; experiments: Experiment[]; invalid: number };

// ---------------------------------------------------------------------------
// A tiny "latest result wins" store (no dependency). Loads lazily on first subscriber.
// ---------------------------------------------------------------------------
export interface LatestStore<T> {
  get: () => T;
  /** React subscription; the first subscriber starts the first load. */
  subscribe: (listener: () => void) => () => void;
  /** Re-run the load. Results of any earlier, still-pending load are dropped. */
  refresh: () => Promise<void>;
  /** Observe changes without starting a load. */
  watch: (listener: () => void) => () => void;
}

export function createLatestStore<T>(initial: T, load: () => Promise<T>): LatestStore<T> {
  let value = initial;
  let seq = 0;
  let started = false;
  const listeners = new Set<() => void>();
  const set = (v: T) => {
    value = v;
    listeners.forEach((l) => l());
  };
  const refresh = async () => {
    started = true;
    const mine = ++seq;
    if (value !== initial) set(initial);
    const next = await load();
    if (mine === seq) set(next); // a newer refresh started meanwhile: this result is stale
  };
  return {
    get: () => value,
    subscribe: (l) => {
      listeners.add(l);
      if (!started) void refresh();
      return () => listeners.delete(l);
    },
    refresh,
    watch: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

// ---------------------------------------------------------------------------
// Summary (counts)
// ---------------------------------------------------------------------------
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
/** Shape check mirroring CatalogStatsSchema (types.ts), without Zod on the landing path. */
export function asStats(d: unknown): CatalogStats | null {
  const s = d as Partial<CatalogStats> | null;
  if (!s || !isCount(s.verified) || !isCount(s.in_review) || typeof s.revision !== 'string') return null;
  if (!Array.isArray(s.campaigns) || !s.campaigns.every((c) => typeof c === 'string')) return null;
  if (s.last_updated !== null && typeof s.last_updated !== 'string') return null;
  return s as CatalogStats;
}

/** Public PostgREST endpoint + anon key (both are meant for the browser; RLS does the protecting). */
export const catalogEnv = () => {
  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
};
export const anonHeaders = (key: string) => ({ apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' });

async function loadSummary(): Promise<CatalogSummary> {
  const env = catalogEnv();
  if (!env) return { state: 'unavailable', reason: 'not_configured' };
  try {
    const res = await fetch(`${env.url}/rest/v1/rpc/catalog_stats`, { method: 'POST', headers: anonHeaders(env.key), body: '{}' });
    const stats = res.ok ? asStats(await res.json()) : null;
    return stats ? { state: 'ready', stats } : { state: 'unavailable', reason: 'error' };
  } catch {
    // Network down, CORS, DNS…
    return { state: 'unavailable', reason: 'error' };
  }
}

const summaryStore = createLatestStore<CatalogSummary>({ state: 'loading' }, loadSummary);

export function useCatalogSummary(): { summary: CatalogSummary; retry: () => void } {
  const summary = useSyncExternalStore(summaryStore.subscribe, summaryStore.get, summaryStore.get);
  return { summary, retry: summaryRetry };
}
const summaryRetry = () => void summaryStore.refresh();

// ---------------------------------------------------------------------------
// Verified rows (the console). Zod + validation load on demand.
// ---------------------------------------------------------------------------
const verifiedStore = createLatestStore<VerifiedCatalog>({ state: 'loading' }, async () =>
  (await import('./catalogData')).fetchVerifiedCatalog(),
);

export function useVerifiedCatalog(): { catalog: VerifiedCatalog; reload: () => void } {
  const catalog = useSyncExternalStore(verifiedStore.subscribe, verifiedStore.get, verifiedStore.get);
  return { catalog, reload: catalogReload };
}
const catalogReload = () => void verifiedStore.refresh();

/**
 * One revision across the page: if the counts and the loaded rows disagree, the side that did
 * NOT just change is the stale one, so it reloads. Both sides read catalog_stats().revision.
 */
export function reconcileRevisions(
  summary: LatestStore<CatalogSummary>,
  catalog: LatestStore<VerifiedCatalog>,
): () => void {
  const revisions = () => {
    const s = summary.get();
    const c = catalog.get();
    return s.state === 'ready' && (c.state === 'ready' || c.state === 'empty') ? { s: s.stats.revision, c: c.revision } : null;
  };
  const offSummary = summary.watch(() => {
    const r = revisions();
    if (r && r.s !== r.c) void catalog.refresh();
  });
  const offCatalog = catalog.watch(() => {
    const r = revisions();
    if (r && r.s !== r.c) void summary.refresh();
  });
  return () => {
    offSummary();
    offCatalog();
  };
}
reconcileRevisions(summaryStore, verifiedStore);

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
