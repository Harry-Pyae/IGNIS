import { useEffect, useState } from 'react';

export type CatalogSummary =
  | { state: 'loading' }
  | { state: 'offline' }
  | { state: 'ready'; experiments: number; campaigns: string[] };

/**
 * Verified-catalog summary for the provenance strip. Supabase is imported lazily so it
 * never sits on the landing page's critical path (LCP).
 */
export function useCatalogSummary(): CatalogSummary {
  const [summary, setSummary] = useState<CatalogSummary>({ state: 'loading' });
  useEffect(() => {
    let alive = true;
    import('./supabase').then(async ({ supabase }) => {
      if (!supabase) return alive && setSummary({ state: 'offline' });
      const { data, error } = await supabase.from('experiments').select('campaign');
      if (!alive) return;
      if (error || !data) return setSummary({ state: 'offline' });
      const campaigns = [...new Set(data.map((r) => r.campaign as string))].sort();
      setSummary({ state: 'ready', experiments: data.length, campaigns });
    });
    return () => {
      alive = false;
    };
  }, []);
  return summary;
}
