/**
 * §7.4 claim-validation pipeline (deterministic code, no LLM):
 *   shape check (Zod) → evidence-ID check → reject → retry once at temp 0.1
 *   → claims that still fail are WITHHELD and counted → twice-failed = controlled fallback.
 *
 * "The model returns structured claims; the server rejects any claim whose
 *  evidence IDs aren't in the retrieved context."
 */
import { type Briefing, type Claim, type Experiment, LlmBriefingSchema } from '../lib/types.js';
import type { ProviderName } from './llm.js';

/** §7.3 forbidden wording. Principle 1: no prediction, ever. */
export const FORBIDDEN_WORDING = /\bpredict\w*|\b(?:will|would)\s+burn/i;

/** Standalone numbers (skips "O2", "E3", "BASS-II"); normalized so "21.0" === "21". */
export function numbersIn(text: string): string[] {
  return (text.match(/(?<![A-Za-z\d.])\d+(?:\.\d+)?/g) ?? []).map((n) => String(Number(n)));
}

export interface EvidenceContext {
  /** E1..Ek, in rank order. */
  ids: Set<string>;
  /** Every number that appears in the serialized cards. */
  numbers: Set<string>;
  /** Serialized cards — the ONLY context the model sees. */
  text: string;
  evidence: { evidence_id: string; experiment_id: string }[];
}

const CONTEXT_FIELDS = [
  'campaign', 'test_id', 'fuel_material', 'material_class', 'fuel_form', 'thickness_mm', 'o2_pct',
  'flow_cm_s', 'pressure_kpa', 'ignition_method', 'outcome', 'spread_rate_mm_s',
  'key_observation_quote', 'observation_summary',
] as const satisfies readonly (keyof Experiment)[];

export function buildContext(experiments: Experiment[]): EvidenceContext {
  const cards = experiments.map((e, i) => ({
    evidence_id: `E${i + 1}`,
    ...Object.fromEntries(CONTEXT_FIELDS.map((f) => [f, e[f]])),
  }));
  const text = cards.map((c) => JSON.stringify(c)).join('\n');
  return {
    ids: new Set(cards.map((c) => c.evidence_id)),
    numbers: new Set(numbersIn(text)),
    text,
    evidence: experiments.map((e, i) => ({ evidence_id: `E${i + 1}`, experiment_id: e.id })),
  };
}

export type ClaimProblem = 'missing_evidence' | 'unknown_evidence_id' | 'forbidden_wording' | 'unsupported_number';

export function claimProblem(claim: Claim, ctx: Pick<EvidenceContext, 'ids' | 'numbers'>): ClaimProblem | null {
  if (claim.classification !== 'UNTESTED' && claim.evidence_ids.length === 0) return 'missing_evidence';
  if (claim.evidence_ids.some((id) => !ctx.ids.has(id))) return 'unknown_evidence_id';
  if (FORBIDDEN_WORDING.test(claim.text)) return 'forbidden_wording';
  if (numbersIn(claim.text).some((n) => !ctx.numbers.has(n))) return 'unsupported_number';
  return null;
}

export type Generate = (temperature: number) => Promise<{ data: unknown; provider: ProviderName }>;

export async function runClaimPipeline(
  generate: Generate,
  ctx: EvidenceContext,
  temps = { first: 0.3, retry: 0.1 },
): Promise<Briefing> {
  const base = { evidence: ctx.evidence };
  const attempt = async (temperature: number) => {
    try {
      const { data, provider } = await generate(temperature);
      const parsed = LlmBriefingSchema.safeParse(data);
      return parsed.success ? { claims: parsed.data.claims, provider } : null;
    } catch {
      return null; // provider outage / timeout counts as a failed attempt
    }
  };

  // Attempt 1: the whole response must pass, otherwise reject and retry.
  const first = await attempt(temps.first);
  if (first && first.claims.length > 0 && first.claims.every((c) => !claimProblem(c, ctx))) {
    return { ...base, status: 'ok', claims: first.claims, withheld_count: 0, provider: first.provider };
  }

  // Attempt 2 (low temperature): keep what validates, withhold — visibly — what doesn't.
  const second = await attempt(temps.retry);
  if (!second) return { ...base, status: 'fallback', claims: [], withheld_count: 0, provider: null };
  const kept = second.claims.filter((c) => !claimProblem(c, ctx));
  const withheld_count = second.claims.length - kept.length;
  return kept.length === 0
    ? { ...base, status: 'fallback', claims: [], withheld_count, provider: second.provider }
    : { ...base, status: 'ok', claims: kept, withheld_count, provider: second.provider };
}
