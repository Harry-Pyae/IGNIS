/**
 * Browser loader for the verified catalog rows (round 3, item 1). Imported on demand by
 * useVerifiedCatalog() in ./catalog, so Zod never lands on the landing path. OWNER: Coder A.
 *
 * Reads as the anon role (RLS: verified rows only), with the same one-snapshot contract as the
 * server (./snapshot): revision → rows → revision, retried while a curator is mid-publish.
 * Every row is validated against ExperimentSchema; a row that fails is left out and counted,
 * never repaired or guessed. The result never contains fixtures.
 */
import { anonHeaders, asStats, catalogEnv, type VerifiedCatalog } from './catalog';
import { CatalogChangingError, readConsistentSnapshot } from './snapshot';
import { type Experiment, ExperimentSchema } from './types';

export async function fetchVerifiedCatalog(
  env: { url: string; key: string } | null = catalogEnv(),
  fetchFn: typeof fetch = fetch,
): Promise<VerifiedCatalog> {
  if (!env) return { state: 'unavailable', reason: 'not_configured' };
  const ok = async (res: Response) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<unknown>;
  };
  try {
    const { rows, revision } = await readConsistentSnapshot(
      async () => {
        const data = await ok(await fetchFn(`${env.url}/rest/v1/experiments?select=*&order=id.asc`, { headers: anonHeaders(env.key) }));
        if (!Array.isArray(data)) throw new Error('rows are not an array');
        return data as unknown[];
      },
      async () => {
        const res = await fetchFn(`${env.url}/rest/v1/rpc/catalog_stats`, { method: 'POST', headers: anonHeaders(env.key), body: '{}' });
        const stats = asStats(await ok(res));
        if (!stats) throw new Error('catalog_stats has an unexpected shape');
        return stats.revision;
      },
    );
    const experiments: Experiment[] = [];
    for (const row of rows) {
      const parsed = ExperimentSchema.safeParse(row);
      // verified_by is re-checked even though RLS already filters: the client never trusts its input.
      if (parsed.success && parsed.data.verified_by != null) experiments.push(parsed.data);
    }
    const invalid = rows.length - experiments.length;
    return experiments.length === 0
      ? { state: 'empty', revision, invalid }
      : { state: 'ready', revision, experiments, invalid };
  } catch (e) {
    return { state: 'unavailable', reason: e instanceof CatalogChangingError ? 'changing' : 'error' };
  }
}
