/**
 * /api/synthesize server boundary (round 2, A4) — runs BEFORE any provider call.
 * Rejects unresolved material, unknown/unverified ids and any card failing the §5b gates,
 * then computes deterministic coverage over the gate-surviving verified catalog.
 */
import { computeCoverage } from '../lib/coverage.js';
import { eligibleCards, gateExperiment } from '../lib/gates.js';
import type { ApiErrorCode, Experiment, ResolvedScenario } from '../lib/types.js';
import { buildContext, type EvidenceContext } from './claims.js';

export type Prepared =
  | { ok: true; ctx: EvidenceContext }
  | { ok: false; status: number; code: ApiErrorCode; message: string; issues?: { path: string; message: string }[] };

/**
 * @param catalog every verified card (read as the anon role, so RLS already removed drafts)
 * @param ids     requested top-k ids in rank order (duplicates already rejected by the schema)
 */
export function prepareSynthesis(
  scenario: ResolvedScenario,
  ids: string[],
  catalog: Experiment[],
  catalogRevision: string,
): Prepared {
  if (scenario.material.status !== 'resolved')
    return {
      ok: false,
      status: 400,
      code: 'invalid_request',
      message: 'Material unresolved — confirm a catalog material before requesting a briefing',
    };

  const byId = new Map(catalog.map((c) => [c.id, c]));
  const unknown = ids.filter((id) => !byId.has(id));
  if (unknown.length)
    return {
      ok: false,
      status: 400,
      code: 'ineligible_evidence',
      message: 'Some experiment_ids are not verified cards',
      issues: unknown.map((id) => ({ path: id, message: 'unknown or unverified experiment id' })),
    };

  const retrieved = ids.map((id) => byId.get(id)!);
  const failing = retrieved.map((c) => gateExperiment(scenario, c)).filter((g) => !g.eligible);
  if (failing.length)
    return {
      ok: false,
      status: 400,
      code: 'ineligible_evidence',
      message: 'Some evidence fails the scenario eligibility gates',
      issues: failing.map((g) => ({ path: g.experiment_id, message: g.reasons.join(', ') })),
    };

  const coverage = computeCoverage(scenario, eligibleCards(scenario, catalog), retrieved, catalogRevision);
  return { ok: true, ctx: buildContext(retrieved, coverage) };
}
