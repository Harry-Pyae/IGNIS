/**
 * Round 3, item 3: header and body read ONE catalog-summary owner, so they always agree:
 * retry recovers both together, and a slow superseded request can never overwrite a newer result.
 * (useCatalogSummary / useVerifiedCatalog are thin useSyncExternalStore readers of these stores.)
 */
import { describe, expect, it, vi } from 'vitest';
import { type CatalogSummary, createLatestStore, reconcileRevisions, type VerifiedCatalog } from '../src/lib/catalog';
import type { CatalogStats } from '../src/lib/types';

const stats = (revision: string, verified = 3): CatalogStats => ({ verified, in_review: 0, campaigns: ['BASS'], last_updated: null, revision });
const ready = (revision: string): CatalogSummary => ({ state: 'ready', stats: stats(revision) });
const failed: CatalogSummary = { state: 'unavailable', reason: 'error' };

/** A load whose responses we release by hand, in any order. */
function controlledLoad<T>() {
  const pending: ((v: T) => void)[] = [];
  const load = vi.fn(() => new Promise<T>((resolve) => pending.push(resolve)));
  return { load, release: (i: number, v: T) => pending[i]!(v) };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

/** Two components (header + body) subscribed to the same store. */
function twoConsumers<T>(store: ReturnType<typeof createLatestStore<T>>) {
  const header: T[] = [];
  const body: T[] = [];
  store.subscribe(() => header.push(store.get()));
  store.subscribe(() => body.push(store.get()));
  return { header: () => header.at(-1) ?? store.get(), body: () => body.at(-1) ?? store.get() };
}

describe('createLatestStore — one owner for the catalog summary', () => {
  it('lazy: nothing loads until a component subscribes; two consumers share ONE request', async () => {
    const c = controlledLoad<CatalogSummary>();
    const store = createLatestStore<CatalogSummary>({ state: 'loading' }, c.load);
    expect(c.load).not.toHaveBeenCalled();
    const ui = twoConsumers(store);
    expect(c.load).toHaveBeenCalledTimes(1);
    c.release(0, ready('r1'));
    await flush();
    expect(ui.header()).toEqual(ready('r1'));
    expect(ui.body()).toEqual(ready('r1'));
  });

  it('failed, then retried from ONE surface: header and body recover together', async () => {
    const c = controlledLoad<CatalogSummary>();
    const store = createLatestStore<CatalogSummary>({ state: 'loading' }, c.load);
    const ui = twoConsumers(store);
    c.release(0, failed);
    await flush();
    expect([ui.header(), ui.body()]).toEqual([failed, failed]);

    void store.refresh(); // the body's Retry button
    expect([ui.header(), ui.body()]).toEqual([{ state: 'loading' }, { state: 'loading' }]);
    c.release(1, ready('r1'));
    await flush();
    expect([ui.header(), ui.body()]).toEqual([ready('r1'), ready('r1')]);
  });

  it('a slow first request finishing LATE never overwrites the retried result', async () => {
    const c = controlledLoad<CatalogSummary>();
    const store = createLatestStore<CatalogSummary>({ state: 'loading' }, c.load);
    const ui = twoConsumers(store);
    void store.refresh(); // user retries while the first request is still hanging
    c.release(1, ready('r2')); // the retry answers first
    await flush();
    c.release(0, failed); // the original slow request finally answers
    await flush();
    expect([ui.header(), ui.body()]).toEqual([ready('r2'), ready('r2')]);
  });
});

describe('reconcileRevisions — counts and rows describe the same revision', () => {
  const catalogAt = (revision: string): VerifiedCatalog => ({ state: 'ready', revision, experiments: [], invalid: 0 });

  it('when the summary moves to a newer revision, the loaded rows reload', async () => {
    const summary = createLatestStore<CatalogSummary>({ state: 'loading' }, vi.fn(async () => ready('r2')));
    const rows = vi.fn(async () => catalogAt('r1'));
    const catalog = createLatestStore<VerifiedCatalog>({ state: 'loading' }, rows);
    await catalog.refresh(); // rows loaded at r1
    reconcileRevisions(summary, catalog);
    rows.mockResolvedValue(catalogAt('r2'));
    await summary.refresh(); // counts now say r2
    await flush();
    expect(rows).toHaveBeenCalledTimes(2);
    expect(catalog.get()).toEqual(catalogAt('r2'));
  });

  it('when fresh rows carry a newer revision, the summary reloads', async () => {
    const summaryLoad = vi.fn(async () => ready('r1'));
    const summary = createLatestStore<CatalogSummary>({ state: 'loading' }, summaryLoad);
    const catalog = createLatestStore<VerifiedCatalog>({ state: 'loading' }, vi.fn(async () => catalogAt('r2')));
    await summary.refresh();
    reconcileRevisions(summary, catalog);
    summaryLoad.mockResolvedValue(ready('r2'));
    await catalog.refresh();
    await flush();
    expect(summaryLoad).toHaveBeenCalledTimes(2);
    expect(summary.get()).toEqual(ready('r2'));
  });

  it('agreeing revisions trigger nothing', async () => {
    const summaryLoad = vi.fn(async () => ready('r1'));
    const rows = vi.fn(async () => catalogAt('r1'));
    const summary = createLatestStore<CatalogSummary>({ state: 'loading' }, summaryLoad);
    const catalog = createLatestStore<VerifiedCatalog>({ state: 'loading' }, rows);
    reconcileRevisions(summary, catalog);
    await summary.refresh();
    await catalog.refresh();
    await flush();
    expect([summaryLoad.mock.calls.length, rows.mock.calls.length]).toEqual([1, 1]);
  });
});
