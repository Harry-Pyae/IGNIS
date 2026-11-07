/**
 * Briefing-cache identity (round 2, B). Coder A implements the cache; this key is the contract.
 * Includes the catalog revision, so correcting / unpublishing any verified card invalidates
 * stale briefings, and the prompt + validator versions, so rule changes do too.
 * Stored in briefings_cache.scenario_hash (+ catalog_revision column for auditing).
 */
import { createHash } from 'node:crypto';
import type { ResolvedScenario } from '../lib/types.js';
import { VALIDATOR_VERSION } from './claims.js';
import { PROMPT_VERSION } from './prompts.js';

const stable = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(stable)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable((v as Record<string, unknown>)[k])]))
      : v;

export function briefingCacheKey(input: {
  scenario: ResolvedScenario;
  experiment_ids: string[];
  catalog_revision: string;
}): string {
  const payload = [PROMPT_VERSION, VALIDATOR_VERSION, input.catalog_revision, input.experiment_ids, stable(input.scenario)];
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
