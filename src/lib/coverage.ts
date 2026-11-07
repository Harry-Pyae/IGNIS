/**
 * Deterministic per-parameter coverage (round 2, A4). Pure, no I/O, no LLM.
 * UNTESTED / outside-range copy is rendered from this result directly; the LLM may only
 * reference the gap ids it contains. Coder A builds the o2×flow gap GRID (Gap Radar) separately.
 *
 * Catalog-wide gaps (scope 'catalog') are about the whole gate-surviving verified catalog;
 * 'retrieved' gaps only say the top-k matches don't report a value the catalog does have.
 */
import { COPY } from './copy.js';
import {
  CONTINUOUS_PARAMS,
  type CoverageGap,
  type CoverageResult,
  type Experiment,
  FIELD_UNITS,
  PARAM_LABELS,
  type ParamCoverage,
  type ResolvedScenario,
} from './types.js';

type CoverageCard = Pick<Experiment, (typeof CONTINUOUS_PARAMS)[number]>;

const fmt = (n: number) => String(Number(n.toFixed(3)));

export function computeCoverage(
  scenario: Pick<ResolvedScenario, (typeof CONTINUOUS_PARAMS)[number]>,
  eligibleCatalog: CoverageCard[],
  retrieved: CoverageCard[],
  catalogRevision: string,
): CoverageResult {
  const params: ParamCoverage[] = CONTINUOUS_PARAMS.map((p) => {
    const value = scenario[p];
    const values = eligibleCatalog.map((c) => c[p]).filter((v): v is number => v != null);
    const min = values.length ? Math.min(...values) : null;
    const max = values.length ? Math.max(...values) : null;
    const retrieved_reporting = retrieved.filter((c) => c[p] != null).length;
    const state: ParamCoverage['state'] =
      value == null
        ? 'not_specified'
        : min == null || max == null
          ? 'untested_in_catalog'
          : value < min || value > max
            ? 'outside_catalog_range'
            : retrieved_reporting === 0
              ? 'not_reported_in_matches'
              : 'covered';
    return { parameter: p, state, scenario_value: value, catalog_min: min, catalog_max: max, retrieved_reporting };
  });

  const gaps: Omit<CoverageGap, 'id'>[] = [];
  if (eligibleCatalog.length === 0) {
    gaps.push({ scope: 'catalog', kind: 'no_eligible_evidence', parameter: null, message: COPY.absence });
  } else {
    for (const c of params) {
      const label = PARAM_LABELS[c.parameter];
      const unit = FIELD_UNITS[c.parameter];
      if (c.state === 'untested_in_catalog')
        gaps.push({
          scope: 'catalog',
          kind: 'untested_in_catalog',
          parameter: c.parameter,
          message: `${label}: ${COPY.absence.charAt(0).toLowerCase()}${COPY.absence.slice(1)}`,
        });
      else if (c.state === 'outside_catalog_range') {
        const span = c.catalog_min === c.catalog_max ? `only ${fmt(c.catalog_min!)} ${unit}` : `${fmt(c.catalog_min!)}–${fmt(c.catalog_max!)} ${unit}`;
        gaps.push({
          scope: 'catalog',
          kind: 'outside_catalog_range',
          parameter: c.parameter,
          message: `${label} ${fmt(c.scenario_value!)} ${unit} is outside the range the current IGNIS catalog covers (${span}). IGNIS cannot cite evidence here.`,
        });
      } else if (c.state === 'not_reported_in_matches')
        gaps.push({
          scope: 'retrieved',
          kind: 'not_reported_in_matches',
          parameter: c.parameter,
          message: `${label}: none of the retrieved experiments report a value.`,
        });
    }
  }

  return {
    catalog_revision: catalogRevision,
    eligible_catalog_count: eligibleCatalog.length,
    retrieved_count: retrieved.length,
    params,
    gaps: gaps.map((g, i) => ({ id: `G${i + 1}`, ...g })),
  };
}
