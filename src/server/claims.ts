/**
 * §7.4 claim-validation pipeline, strengthened in round 2 (A3). Deterministic code, no LLM.
 *
 *   shape check (Zod) → per-claim checks against the CITED cards → reject → retry once at
 *   temp 0.1 → claims that still fail are WITHHELD and counted → twice-failed = fallback.
 *
 * What a validated claim guarantees (say exactly this, no more):
 *  • OBSERVED/SUPPORTED cite ≥1 retrieved card and carry typed refs {evidence_id, field, value, unit};
 *    each ref must equal the CITED card's actual field value and canonical unit.
 *  • Every number in the text must be one of the claim's ref values (with a matching unit when a
 *    unit is written); every outcome word must be backed by an outcome ref. Numbers can no longer
 *    be borrowed from uncited cards.
 *  • OBSERVED text shown to users is RENDERED by the server from the refs — model prose is discarded.
 *  • UNTESTED claims may only point at gap ids from the deterministic CoverageResult; their text is
 *    the server's gap message.
 *  • The wording filter blocks common future-tense phrasing. It is a backstop, not the guarantee:
 *    SUPPORTED prose remains interpretation and is labeled as such.
 */
import {
  type Briefing,
  type Claim,
  type CoverageGap,
  type CoverageResult,
  type Experiment,
  type FactField,
  type FactRef,
  FIELD_UNITS,
  LlmBriefingSchema,
  type Outcome,
  PARAM_LABELS,
} from '../lib/types.js';
import type { ProviderName } from './llm.js';

export const VALIDATOR_VERSION = 'claims-v2';

/** Future-tense / forecasting phrasing (Principle 1). Backstop only — see header. */
export const FORBIDDEN_WORDING =
  /\b(?:predict\w*|forecast\w*|will|would|shall|expected\s+to|likely\s+to|projected\s+to|is\s+going\s+to)\b/i;

const OUTCOME_TERMS: Record<Outcome, RegExp> = {
  extinguished: /\b(?:extinguish\w*|quench\w*|went\s+out|blow-?off|blew\s+out)\b/i,
  sustained: /\b(?:sustain\w*|kept\s+burning|continued\s+(?:to\s+)?burn\w*|burned\s+to\s+completion|complete\s+burnout)\b/i,
  transition: /\btransition\w*\b/i,
  partial: /\bpartial\w*\b/i,
};

/** A standalone number with an optional unit right after it. Skips "O2", "E3", "GMT96". */
const NUMBER_WITH_UNIT = /(?<![A-Za-z\d.])(\d+(?:\.\d+)?)(?:\s*(%|cm\/s|mm\/s|mm|kPa|atm|s\b))?/g;

const NUMERIC_FIELDS = new Set<FactField>(['o2_pct', 'flow_cm_s', 'thickness_mm', 'pressure_kpa', 'spread_rate_mm_s']);
const unitOf = (field: FactField): string | null =>
  NUMERIC_FIELDS.has(field) ? FIELD_UNITS[field as keyof typeof FIELD_UNITS] : null;

export interface EvidenceContext {
  /** E1..Ek → card, in rank order. */
  cards: Map<string, Experiment>;
  gaps: Map<string, CoverageGap>;
  coverage: CoverageResult;
  /** Serialized cards + gaps — the ONLY context the model sees. */
  text: string;
  evidence: { evidence_id: string; experiment_id: string }[];
}

const CONTEXT_FIELDS = [
  'campaign', 'test_id', 'fuel_material', 'material_class', 'fuel_form', 'thickness_mm', 'o2_pct',
  'flow_cm_s', 'pressure_kpa', 'ignition_method', 'outcome', 'spread_rate_mm_s',
  'key_observation_quote', 'observation_summary', 'condition_changes', 'notes',
] as const satisfies readonly (keyof Experiment)[];

export function buildContext(experiments: Experiment[], coverage: CoverageResult): EvidenceContext {
  const cards = new Map(experiments.map((e, i) => [`E${i + 1}`, e]));
  const lines = [...cards].map(([id, e]) =>
    JSON.stringify({ evidence_id: id, ...Object.fromEntries(CONTEXT_FIELDS.map((f) => [f, e[f]])) }),
  );
  const gapLines = coverage.gaps.map((g) => JSON.stringify({ gap_id: g.id, scope: g.scope, message: g.message }));
  return {
    cards,
    gaps: new Map(coverage.gaps.map((g) => [g.id, g])),
    coverage,
    text: `CARDS:\n${lines.join('\n')}\n\nGAPS (the only things you may call untested):\n${gapLines.join('\n') || '(none)'}`,
    evidence: [...cards].map(([evidence_id, e]) => ({ evidence_id, experiment_id: e.id })),
  };
}

export type ClaimProblem =
  | 'forbidden_wording'
  | 'missing_evidence'
  | 'unknown_evidence_id'
  | 'missing_refs'
  | 'ref_not_cited'
  | 'ref_mismatch'
  | 'unit_mismatch'
  | 'unsupported_number'
  | 'unsupported_outcome'
  | 'missing_gap'
  | 'unknown_gap';

function refProblem(ref: FactRef, card: Experiment): 'ref_mismatch' | 'unit_mismatch' | null {
  const actual = card[ref.field];
  if (actual == null) return 'ref_mismatch';
  if (typeof actual === 'number') {
    if (Number(ref.value) !== actual) return 'ref_mismatch';
    return ref.unit === unitOf(ref.field) ? null : 'unit_mismatch';
  }
  if (String(ref.value).trim().toLowerCase() !== String(actual).toLowerCase()) return 'ref_mismatch';
  return ref.unit == null ? null : 'unit_mismatch';
}

export function claimProblem(claim: Claim, ctx: Pick<EvidenceContext, 'cards' | 'gaps'>): ClaimProblem | null {
  if (FORBIDDEN_WORDING.test(claim.text)) return 'forbidden_wording';
  if (claim.evidence_ids.some((id) => !ctx.cards.has(id))) return 'unknown_evidence_id';

  if (claim.classification === 'UNTESTED') {
    if (claim.gap_ids.length === 0) return 'missing_gap';
    return claim.gap_ids.every((g) => ctx.gaps.has(g)) ? null : 'unknown_gap';
  }

  if (claim.evidence_ids.length === 0) return 'missing_evidence';
  if (claim.refs.length === 0) return 'missing_refs';
  for (const ref of claim.refs) {
    if (!claim.evidence_ids.includes(ref.evidence_id)) return 'ref_not_cited';
    const p = refProblem(ref, ctx.cards.get(ref.evidence_id)!);
    if (p) return p;
  }

  // Identifiers of cited cards ("BASS-II test 17") may contain digits; they are not measurements.
  let text = claim.text;
  for (const id of claim.evidence_ids) {
    const card = ctx.cards.get(id)!;
    for (const name of [card.test_id, card.campaign]) text = text.split(name).join(' ');
  }
  // Backing numbers: the claim's own refs, plus the recorded start/end values of a cited
  // card's changing conditions (so "flow reduced 10 → 2.2 cm/s" can be stated honestly).
  const backingValues = [
    ...claim.refs.filter((r) => NUMERIC_FIELDS.has(r.field)).map((r) => ({ value: Number(r.value), unit: r.unit })),
    ...claim.evidence_ids.flatMap((id) =>
      (ctx.cards.get(id)!.condition_changes ?? []).flatMap((c) => [
        { value: c.from, unit: FIELD_UNITS[c.parameter] as string | null },
        { value: c.to, unit: FIELD_UNITS[c.parameter] as string | null },
      ]),
    ),
  ];
  for (const m of text.matchAll(NUMBER_WITH_UNIT)) {
    const backing = backingValues.filter((b) => b.value === Number(m[1]));
    if (backing.length === 0) return 'unsupported_number';
    if (m[2] && !backing.some((b) => b.unit === m[2])) return 'unit_mismatch';
  }
  for (const [outcome, re] of Object.entries(OUTCOME_TERMS) as [Outcome, RegExp][])
    if (re.test(text) && !claim.refs.some((r) => r.field === 'outcome' && r.value === outcome)) return 'unsupported_outcome';
  return null;
}

// ---------------------------------------------------------------------------
// Deterministic rendering
// ---------------------------------------------------------------------------
const FACT_LABELS: Record<FactField, string> = {
  outcome: 'outcome',
  o2_pct: PARAM_LABELS.o2_pct,
  flow_cm_s: PARAM_LABELS.flow_cm_s,
  thickness_mm: PARAM_LABELS.thickness_mm,
  pressure_kpa: PARAM_LABELS.pressure_kpa,
  spread_rate_mm_s: 'spread rate',
  fuel_material: 'material',
  material_class: 'material class',
  fuel_form: 'form',
};

const fmtRef = (r: FactRef) => {
  const unit = unitOf(r.field);
  return unit ? `${FACT_LABELS[r.field]} ${r.value} ${unit}` : `${FACT_LABELS[r.field]} ${r.value}`;
};

/** OBSERVED text = the cited cards' validated facts + any changing-condition qualifier. */
export function renderObserved(refs: FactRef[], ctx: Pick<EvidenceContext, 'cards'>): string {
  const byCard = new Map<string, FactRef[]>();
  for (const r of refs) byCard.set(r.evidence_id, [...(byCard.get(r.evidence_id) ?? []), r]);
  return [...byCard]
    .map(([id, rs]) => {
      const card = ctx.cards.get(id)!;
      const qualifiers = (card.condition_changes ?? [])
        .filter((c) => rs.some((r) => r.field === c.parameter))
        .map((c) => ` (${PARAM_LABELS[c.parameter]} changed ${c.from} → ${c.to} ${FIELD_UNITS[c.parameter]} during the run: ${c.note})`);
      return `${card.test_id}: ${rs.map(fmtRef).join(', ')}${qualifiers.join('')}.`;
    })
    .join(' ');
}

/** One OBSERVED claim per card from its own facts — the evidence-only fallback. */
export function deterministicObserved(ctx: Pick<EvidenceContext, 'cards'>): Claim[] {
  return [...ctx.cards].map(([id, card]) => {
    const refs: FactRef[] = [{ evidence_id: id, field: 'outcome', value: card.outcome, unit: null }];
    for (const f of ['o2_pct', 'flow_cm_s', 'thickness_mm', 'pressure_kpa'] as const)
      if (card[f] != null) refs.push({ evidence_id: id, field: f, value: card[f], unit: FIELD_UNITS[f] });
    return { classification: 'OBSERVED', text: renderObserved(refs, ctx), evidence_ids: [id], refs, gap_ids: [] };
  });
}

function finalize(claim: Claim, ctx: EvidenceContext): Claim {
  if (claim.classification === 'OBSERVED') return { ...claim, text: renderObserved(claim.refs, ctx) };
  if (claim.classification === 'UNTESTED')
    return { ...claim, text: claim.gap_ids.map((g) => ctx.gaps.get(g)!.message).join(' ') };
  return claim; // SUPPORTED: validated, visibly labeled as interpretation by the UI
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
export type Generate = (temperature: number) => Promise<{ data: unknown; provider: ProviderName }>;

export async function runClaimPipeline(
  generate: Generate,
  ctx: EvidenceContext,
  temps = { first: 0.3, retry: 0.1 },
): Promise<Briefing> {
  const base = { evidence: ctx.evidence, coverage: ctx.coverage, catalog_revision: ctx.coverage.catalog_revision };
  const attempt = async (temperature: number) => {
    try {
      const { data, provider } = await generate(temperature);
      const parsed = LlmBriefingSchema.safeParse(data);
      return parsed.success ? { claims: parsed.data.claims, provider } : null;
    } catch {
      return null; // provider outage / timeout counts as a failed attempt
    }
  };
  const fallback = (withheld_count: number, provider: ProviderName | null): Briefing => ({
    ...base,
    status: 'fallback',
    claims: deterministicObserved(ctx),
    withheld_count,
    provider,
  });

  // Attempt 1: the whole response must pass, otherwise reject and retry.
  const first = await attempt(temps.first);
  if (first && first.claims.length > 0 && first.claims.every((c) => !claimProblem(c, ctx)))
    return { ...base, status: 'ok', claims: first.claims.map((c) => finalize(c, ctx)), withheld_count: 0, provider: first.provider };

  // Attempt 2 (low temperature): keep what validates, withhold — visibly — what doesn't.
  const second = await attempt(temps.retry);
  if (!second) return fallback(0, null);
  const kept = second.claims.filter((c) => !claimProblem(c, ctx));
  const withheld_count = second.claims.length - kept.length;
  return kept.length === 0
    ? fallback(withheld_count, second.provider)
    : { ...base, status: 'ok', claims: kept.map((c) => finalize(c, ctx)), withheld_count, provider: second.provider };
}
