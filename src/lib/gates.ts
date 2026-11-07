/**
 * §5b Stage 1 eligibility gates — the ONE implementation (pure, no I/O).
 * Used by /api/synthesize to reject ineligible evidence before any provider call, and by
 * Part 2's engine before scoring. OWNER OF THE LOGIC: Part 2 — extend it HERE (never fork it);
 * the signature and GateResult shape are a Part 1 contract.
 *
 * Shipped minimal + correct: domain equal → fuel exact OR same material_class → form compatible.
 */
import type { Experiment, FuelForm, GateReason, GateResult, ResolvedScenario } from './types.js';

/** sheet ~ slab allowed; every other form only matches itself (fabric ≠ rod). */
const FORM_COMPAT: Record<FuelForm, readonly FuelForm[]> = {
  flat_sheet: ['flat_sheet', 'thick_slab'],
  thick_slab: ['thick_slab', 'flat_sheet'],
  rod: ['rod'],
  fabric: ['fabric'],
};

export type GateCard = Pick<Experiment, 'id' | 'domain' | 'fuel_material' | 'material_class' | 'fuel_form'>;

export function gateExperiment(scenario: ResolvedScenario, card: GateCard): GateResult {
  const reasons: GateReason[] = [];
  // Domain gate runs first and always: SAME (smoke_detection) never enters solid retrieval.
  if (card.domain !== scenario.domain) reasons.push('domain_mismatch');

  let fuel_match: GateResult['fuel_match'] = null;
  const m = scenario.material;
  if (m.status !== 'resolved') reasons.push('material_unresolved');
  else if (card.fuel_material.trim().toLowerCase() === m.fuel_material.trim().toLowerCase()) fuel_match = 'exact';
  else if (card.material_class === m.material_class) fuel_match = 'class';
  else reasons.push('material_mismatch');

  // A null scenario form means "not stated": the form gate has nothing to compare.
  if (scenario.fuel_form && !FORM_COMPAT[scenario.fuel_form].includes(card.fuel_form)) reasons.push('form_incompatible');

  const eligible = reasons.length === 0;
  return { experiment_id: card.id, eligible, reasons, fuel_match: eligible ? fuel_match : null };
}

export function eligibleCards<T extends GateCard>(scenario: ResolvedScenario, cards: T[]): T[] {
  return cards.filter((c) => gateExperiment(scenario, c).eligible);
}
