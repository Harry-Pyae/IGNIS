/**
 * §5b–§5d matching engine: gates → weighted similarity → chips → ranked list. OWNER: Coder A.
 * Pure and deterministic — no I/O, no LLM. Implements the FROZEN scoring semantics written
 * above MatchResultSchema in src/lib/types.ts; read those before changing anything here.
 */
import { computeCoverage } from '../lib/coverage.js';
import { COPY } from '../lib/copy.js';
import { gateExperiment } from '../lib/gates.js';
import {
  CONTINUOUS_PARAMS,
  type ChipStatus,
  type ContinuousParam,
  type CoverageResult,
  type Experiment,
  type MatchChips,
  type MatchResult,
  PARAM_LABELS,
  type ResolvedScenario,
  type UnscoredCounts,
} from '../lib/types.js';

export const WEIGHTS: Record<ContinuousParam, number> = { o2_pct: 0.35, flow_cm_s: 0.3, thickness_mm: 0.2, pressure_kpa: 0.15 };
export const EXACT_FUEL_BONUS = 0.1;
const SAME = 0.05;
const CLOSE = 0.2;
const EPS = 1e-9;

type Range = { min: number; max: number } | null;

/** min/max of each parameter over the gate-surviving cards that report it (null = none report it). */
export function paramRanges(cards: Pick<Experiment, ContinuousParam>[]): Record<ContinuousParam, Range> {
  const out = {} as Record<ContinuousParam, Range>;
  for (const p of CONTINUOUS_PARAMS) {
    const v = cards.map((c) => c[p]).filter((x): x is number => x != null);
    out[p] = v.length ? { min: Math.min(...v), max: Math.max(...v) } : null;
  }
  return out;
}

/** One parameter's chip, and its contribution when it is scored (null = excluded from the score). */
function scoreParam(scen: number | null, card: number | null, r: Range): { chip: ChipStatus; contribution: number | null } {
  if (scen == null) return { chip: 'not_specified', contribution: null };
  if (!r) return { chip: 'untested', contribution: null };
  const span = r.max - r.min;
  const scorable = card != null && span > 0;
  const d = scorable ? Math.min(Math.abs(scen - card) / span, 1) : null;
  // Outside wins over every chip below; still scored (d capped at 1), never clamped.
  if (scen < r.min - EPS || scen > r.max + EPS) return { chip: 'outside_range', contribution: d == null ? null : 1 - d };
  if (card == null) return { chip: 'not_reported', contribution: null };
  // Zero range: inside [v, v] means equal to v; it cannot discriminate, so it is not scored.
  if (d == null) return { chip: 'same', contribution: null };
  return { chip: d <= SAME + EPS ? 'same' : d <= CLOSE + EPS ? 'close' : 'different', contribution: 1 - d };
}

/** Why an excluded param is excluded — mirrors the null-contribution branches of scoreParam. */
function unscoredReason(scen: number | null, card: number | null, r: Range): keyof UnscoredCounts {
  if (scen == null) return 'not_specified';
  if (!r) return 'none_reported';
  if (card == null) return 'not_reported';
  return 'identical'; // zero range: the only other excluded case
}

const rank = (a: MatchResult, b: MatchResult) =>
  Number(a.weak_evidence) - Number(b.weak_evidence) ||
  (Math.abs(b.score - a.score) > EPS ? b.score - a.score : 0) ||
  b.scored_params - a.scored_params ||
  (a.chips.fuel === b.chips.fuel ? 0 : a.chips.fuel === 'exact' ? -1 : 1) ||
  a.experiment.test_id.localeCompare(b.experiment.test_id) ||
  a.experiment.id.localeCompare(b.experiment.id);

/**
 * Every eligible verified card, ranked. The domain gate runs before any scoring, so SAME
 * (smoke_detection) and anything that is not solid flammability can never appear here.
 */
export function matchScenario(scenario: ResolvedScenario, catalog: Experiment[]): MatchResult[] {
  const gated = catalog
    .filter((c) => c.verified_by != null) // RLS already does this; the engine never trusts its input.
    .map((c) => ({ card: c, gate: gateExperiment(scenario, c) }))
    .filter((g) => g.gate.eligible);
  const ranges = paramRanges(gated.map((g) => g.card));

  return gated
    .map(({ card, gate }): MatchResult => {
      const fuel = gate.fuel_match ?? 'class';
      const chips = { fuel } as MatchChips;
      let num = 0;
      let den = 0;
      let scored_params = 0;
      const unscored: UnscoredCounts = { not_specified: 0, identical: 0, not_reported: 0, none_reported: 0 };
      for (const p of CONTINUOUS_PARAMS) {
        const { chip, contribution } = scoreParam(scenario[p], card[p], ranges[p]);
        chips[p] = chip;
        if (contribution != null) {
          num += WEIGHTS[p] * contribution;
          den += WEIGHTS[p];
          scored_params++;
        } else {
          unscored[unscoredReason(scenario[p], card[p], ranges[p])]++;
        }
      }
      const base = den > 0 ? num / den : 0;
      const score = Math.min(1, base + (fuel === 'exact' ? EXACT_FUEL_BONUS : 0));
      return {
        experiment: card,
        chips,
        scored_params,
        unscored,
        total_params: CONTINUOUS_PARAMS.length,
        score,
        weak_evidence: scored_params === 0,
      };
    })
    .sort(rank);
}

export interface Retrieval {
  /** Top-k in rank order (k ≤ 5) — what the console shows and /api/synthesize receives. */
  matches: MatchResult[];
  eligible_count: number;
  coverage: CoverageResult;
}

/** The whole deterministic retrieval step: ranked matches + per-parameter coverage over the same population. */
export function retrieve(scenario: ResolvedScenario, catalog: Experiment[], catalogRevision: string, k = 5): Retrieval {
  const all = matchScenario(scenario, catalog);
  const matches = all.slice(0, Math.min(k, 5));
  const coverage = computeCoverage(
    scenario,
    all.map((m) => m.experiment),
    matches.map((m) => m.experiment),
    catalogRevision,
  );
  return { matches, eligible_count: all.length, coverage };
}

// ---------------------------------------------------------------------------
// §5c "WHY THIS MATCHED" — rendered from chips only, never by the LLM.
// ---------------------------------------------------------------------------
export const CHIP_SYMBOL: Record<ChipStatus, string> = {
  exact: '✓',
  same: '✓',
  class: '≈',
  close: '≈',
  different: '≠',
  not_reported: '⚠',
  untested: '∅',
  outside_range: '⇥',
  not_specified: '–',
};
export const CHIP_TEXT: Record<ChipStatus, string> = {
  exact: 'exact',
  class: 'same class',
  same: 'same',
  close: 'close',
  different: 'different',
  not_reported: 'not reported',
  untested: 'untested',
  outside_range: 'outside catalog range',
  not_specified: 'not specified',
};

export interface WhyLine {
  key: 'fuel' | ContinuousParam;
  status: ChipStatus;
  symbol: string;
  /** e.g. "Oxygen: same" */
  text: string;
}

export function whyMatched(m: MatchResult): { summary: string; lines: WhyLine[] } {
  const line = (key: WhyLine['key'], label: string, status: ChipStatus): WhyLine => ({
    key,
    status,
    symbol: CHIP_SYMBOL[status],
    text: `${label}: ${CHIP_TEXT[status]}`,
  });
  return {
    summary: [
      m.weak_evidence ? COPY.weakEvidence(m.total_params) : COPY.compared(m.scored_params, m.total_params),
      ...(Object.keys(COPY.unscored) as (keyof UnscoredCounts)[])
        .filter((k) => m.unscored[k] > 0)
        .map((k) => COPY.unscored[k](m.unscored[k])),
    ].join(' · '),
    lines: [
      line('fuel', 'Material', m.chips.fuel),
      ...CONTINUOUS_PARAMS.map((p) => line(p, PARAM_LABELS[p], m.chips[p])),
    ],
  };
}
