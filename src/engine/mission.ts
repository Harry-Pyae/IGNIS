/**
 * Guided-mission entry gate (DECISIONS-ROUND4 #1, DECISIONS-ROUND6 #1). OWNER: Coder A; Coder B renders the entry.
 * The mission opens only for a case reviewed by a named person, built from cards verified in the current catalog
 * snapshot. Until then the entry shows COPY.missionAvailability and "Explore the evidence" stays usable.
 * Never fixture points on the public site.
 */
import { COPY } from '../lib/copy.js';
import type { Experiment } from '../lib/types.js';
import { verifierNameProblem } from '../lib/verifier.js';
import { presetScenario, SCENARIO_PRESETS } from './aliases.js';
import { matchScenario } from './match.js';

export interface MissionCase {
  /** SCENARIO_PRESETS id the case opens with. */
  preset_id: string;
  /** The verified cards the case walks through (target: ≥3 strong matches + one clean gap, Round 4 #1). */
  experiment_ids: string[];
  /** Full name of the person who reviewed the case and its captions (null until then). */
  reviewed_by: string | null;
}

/**
 * No case yet: R1/R3 choose it from the verified catalog in the event window, never scripted ahead of it.
 * To enable, replace null with the signed handoff from docs/catalog-coverage.md:
 *   { preset_id: '<SCENARIO_PRESETS id with a material>', experiment_ids: ['<uuid>', '<uuid>', '<uuid>'], reviewed_by: '<reviewer full name>' }
 * The gate opens only if every ID is verified, solid, distinct (≥3) and among that preset's current top-5 matches.
 */
export const MISSION_CASE: MissionCase | null = null;

export type MissionEntry = { state: 'available'; case: MissionCase } | { state: 'unavailable'; message: string };

export function missionEntry(catalog: readonly Experiment[], c: MissionCase | null = MISSION_CASE): MissionEntry {
  const solid = catalog.filter((e) => e.verified_by != null && e.domain === 'solid_flammability');
  const verified = new Set(solid.map((e) => e.id));
  const preset = SCENARIO_PRESETS.find((p) => p.id === c?.preset_id);
  // The mission walks the preset's own deterministic top matches, so the reviewed IDs must be among them
  // (a resolved preset; a later publication that displaces a reviewed card closes the mission until re-review).
  const shown = preset?.material ? new Set(matchScenario(presetScenario(preset, solid), solid).slice(0, 5).map((m) => m.experiment.id)) : new Set<string>();
  const ready =
    c != null && !verifierNameProblem(c.reviewed_by) && preset != null &&
    c.experiment_ids.length >= 3 && new Set(c.experiment_ids).size === c.experiment_ids.length &&
    c.experiment_ids.every((id) => verified.has(id) && shown.has(id));
  return ready ? { state: 'available', case: c } : { state: 'unavailable', message: COPY.missionAvailability };
}
