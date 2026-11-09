/**
 * One verified-catalog snapshot: rows and revision that describe the SAME database state
 * (round 3, review §2B). Used by /api/synthesize, /api/export and the browser catalog loader.
 * OWNER: Coder A. Pure — the callers supply the two reads.
 *
 * Why revision → rows → revision is enough: catalog_stats().revision is an md5 over every verified
 * row's `id:updated_at`, and a trigger moves `updated_at` on every write. So any publish, correction
 * or unpublish that commits changes the revision for good. If the revision is the same before and
 * after the rows were read, no verified write committed in between, and the rows are exactly that
 * revision. (Two parallel reads, or two sequential ones, can pair old rows with a new revision.)
 */

export class CatalogChangingError extends Error {
  constructor(attempts: number) {
    super(`The verified catalog changed during ${attempts} consecutive reads; try again`);
  }
}

export interface CatalogSnapshot<T> {
  rows: T[];
  revision: string;
}

/** Bounded: a curator publishing several cards in a burst gets `attempts` tries, then a clear retryable error. */
export async function readConsistentSnapshot<T>(
  readRows: () => Promise<T[]>,
  readRevision: () => Promise<string>,
  attempts = 3,
): Promise<CatalogSnapshot<T>> {
  for (let i = 0; i < attempts; i++) {
    const before = await readRevision();
    const rows = await readRows();
    const after = await readRevision();
    if (before === after) return { rows, revision: after };
  }
  throw new CatalogChangingError(attempts);
}
