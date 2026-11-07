import { describe, expect, it } from 'vitest';
import { briefingCacheKey } from '../src/server/cacheKey';
import { scenario } from './helpers';

describe('briefing cache key (B)', () => {
  const base = { scenario: scenario(), experiment_ids: ['a', 'b'], catalog_revision: 'r1' };
  it('is stable for the same input regardless of key order', () => {
    const s = scenario();
    const reordered = Object.fromEntries(Object.entries(s).reverse()) as typeof s;
    expect(briefingCacheKey({ ...base, scenario: reordered })).toBe(briefingCacheKey(base));
  });
  it('changes when a card is corrected or unpublished (catalog revision)', () =>
    expect(briefingCacheKey({ ...base, catalog_revision: 'r2' })).not.toBe(briefingCacheKey(base)));
  it('changes with evidence order', () =>
    expect(briefingCacheKey({ ...base, experiment_ids: ['b', 'a'] })).not.toBe(briefingCacheKey(base)));
});
