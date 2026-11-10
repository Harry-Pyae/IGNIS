/**
 * Guided-mission entry gate (DECISIONS-ROUND4 #1, DECISIONS-ROUND6 #1). OWNER: Coder A; Coder B renders the entry.
 * The mission opens only for a case reviewed by a named person, built from cards verified in the current catalog
 * snapshot. Until then the entry shows COPY.missionAvailability and "Explore the evidence" stays usable.
 * Never fixture points on the public site.
 */
import { COPY } from '../lib/copy.js';
import type { Experiment } from '../lib/types.js';
import { verifierNameProblem } from '../lib/verifier.js';

export interface MissionCase {
  /** SCENARIO_PRESETS id the case opens with. */
  preset_id: string;
  /** The verified cards the case walks through (target: ≥3 strong matches + one clean gap, Round 4 #1). */
  experiment_ids: string[];
  /** Full name of the person who reviewed the case and its captions (null until then). */
  reviewed_by: string | null;
}

/** No case yet: R1/R3 choose it from the verified catalog in the event window, never scripted ahead of it. */
export const MISSION_CASE: MissionCase | null = null;

export type MissionEntry = { state: 'available'; case: MissionCase } | { state: 'unavailable'; message: string };

export function missionEntry(catalog: readonly Experiment[], c: MissionCase | null = MISSION_CASE): MissionEntry {
  const verified = new Set(catalog.filter((e) => e.verified_by != null).map((e) => e.id));
  const ready =
    c != null && !verifierNameProblem(c.reviewed_by) && c.experiment_ids.length > 0 && c.experiment_ids.every((id) => verified.has(id));
  return ready ? { state: 'available', case: c } : { state: 'unavailable', message: COPY.missionAvailability };
}
