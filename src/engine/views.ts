/**
 * The four populations the console renders, from one catalog snapshot (round 3, item 1). OWNER: Coder A.
 * Coder B renders these counts and lists; it never recomputes eligibility or plotting rules.
 *
 *   all_verified  every verified card in the snapshot (any domain)
 *   eligible      solid-flammability cards that pass the scenario's gates (all solid cards when
 *                 no scenario is active). SAME never enters.
 *   plotted       eligible cards that report BOTH o2_pct and flow_cm_s (the map's axes). A card
 *                 missing either stays in `eligible` and the table; null never becomes zero.
 *   top_k         retrieve()'s ranked matches (k ≤ 5), with chips; empty without a scenario.
 */
import { eligibleCards } from '../lib/gates.js';
import type { CoverageResult, Experiment, MatchResult, ResolvedScenario } from '../lib/types.js';
import { retrieve } from './match.js';
import { GRID } from './gaps.js';

/** Separate missing coordinates from measured points beyond the displayed axes. */
export function mapCoordinates(experiments: Experiment[]) {
  const coordinates = experiments.filter((e) => e.o2_pct != null && e.flow_cm_s != null);
  const onAxes = (e: Experiment) => e.o2_pct! >= GRID.o2.min && e.o2_pct! <= GRID.o2.max &&
    e.flow_cm_s! >= GRID.flow.min && e.flow_cm_s! <= GRID.flow.max;
  return {
    coordinates,
    visible: coordinates.filter(onAxes),
    outside: coordinates.filter((e) => !onAxes(e)),
    missing: experiments.filter((e) => e.o2_pct == null || e.flow_cm_s == null),
  };
}

export interface EvidenceViews {
  revision: string;
  all_verified: Experiment[];
  eligible: Experiment[];
  plotted: Experiment[];
  /** eligible cards that cannot be plotted, with the axis they lack. */
  not_plotted: { experiment: Experiment; missing: ('o2_pct' | 'flow_cm_s')[] }[];
  top_k: MatchResult[];
  /** Per-parameter coverage for the active scenario; null without one. */
  coverage: CoverageResult | null;
}

/**
 * Revision binding (round 3; reused by the Round 6 summary strip). A Brief is current only for the exact confirmed
 * scenario, catalog revision and matched ids it was requested for: change any of them and the old Brief is not shown.
 */
export const briefingKey = (scenario: ResolvedScenario, catalog_revision: string, experiment_ids: string[]) =>
  JSON.stringify({ scenario, catalog_revision, experiment_ids });

export const currentBriefing = <T>(result: { key: string; data: T } | null, requestKey: string | null): T | null =>
  requestKey != null && result?.key === requestKey ? result.data : null;

/**
 * Current-investigation summary (DECISIONS-ROUND6 #2): which scenario the displayed counts belong to. Until a
 * scenario is confirmed the counts are whole-catalog counts, flagged as such, with no top-match count.
 */
export function investigationSummary(draft: ResolvedScenario, confirmed: ResolvedScenario | null, views: EvidenceViews | null) {
  return {
    scenario: confirmed ?? draft,
    confirmed: confirmed != null,
    counts: views && {
      eligible: views.eligible.length,
      plotted: views.plotted.length,
      not_plotted: views.not_plotted.length,
      top_k: confirmed ? views.top_k.length : null,
    },
  };
}

export function evidenceViews(
  catalog: Experiment[],
  scenario: ResolvedScenario | null,
  revision: string,
  k = 5,
): EvidenceViews {
  const all_verified = catalog.filter((c) => c.verified_by != null);
  const solid = all_verified.filter((c) => c.domain === 'solid_flammability');
  const eligible = scenario ? eligibleCards(scenario, solid) : solid;
  const plotted = eligible.filter((c) => c.o2_pct != null && c.flow_cm_s != null);
  const not_plotted = eligible
    .filter((c) => c.o2_pct == null || c.flow_cm_s == null)
    .map((experiment) => ({
      experiment,
      missing: (['o2_pct', 'flow_cm_s'] as const).filter((p) => experiment[p] == null),
    }));
  const r = scenario ? retrieve(scenario, all_verified, revision, k) : null;
  return { revision, all_verified, eligible, plotted, not_plotted, top_k: r?.matches ?? [], coverage: r?.coverage ?? null };
}
