/**
 * IGNIS shared contracts. Parts 2 and 3 code against this file.
 * OWNER: Part 1. Changes go through a request to Part 1, never edited on a part branch.
 *
 * Mirrors supabase/migrations/0001_init.sql (IGNIS_BUILD_PLAN.md §4) and the
 * LLM/claim contracts in §5, §7.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums (§4 check constraints + §5 fuel forms)
// ---------------------------------------------------------------------------
export const DomainSchema = z.enum(['solid_flammability', 'smoke_detection']);
export const MaterialClassSchema = z.enum(['thermoplastic', 'fabric', 'aramid_fabric', 'insulation', 'other']);
/** Not a DB constraint (§4 comment only) — enforced here so §5 form gates stay total. */
export const FuelFormSchema = z.enum(['flat_sheet', 'rod', 'fabric', 'thick_slab']);
export const OutcomeSchema = z.enum(['sustained', 'extinguished', 'transition', 'partial']);

export type Domain = z.infer<typeof DomainSchema>;
export type MaterialClass = z.infer<typeof MaterialClassSchema>;
export type FuelForm = z.infer<typeof FuelFormSchema>;
export type Outcome = z.infer<typeof OutcomeSchema>;

// ---------------------------------------------------------------------------
// Experiment (one evidence card) — every column of `experiments`
// ---------------------------------------------------------------------------
export const TelemetrySchema = z.object({
  label: z.string().min(1),
  x_label: z.string().min(1),
  y_label: z.string().min(1),
  points: z.array(z.tuple([z.number(), z.number()])).min(2),
});
export type Telemetry = z.infer<typeof TelemetrySchema>;

const nullableNum = (min?: number, max?: number) => {
  let n = z.number();
  if (min !== undefined) n = n.min(min);
  if (max !== undefined) n = n.max(max);
  return n.nullable();
};
const nullableText = z.string().trim().min(1).nullable();

export const ExperimentInsertSchema = z.object({
  domain: DomainSchema,
  campaign: z.string().trim().min(1),
  test_id: z.string().trim().min(1),
  fuel_material: z.string().trim().min(1),
  material_class: MaterialClassSchema,
  fuel_form: FuelFormSchema,
  thickness_mm: nullableNum(0),
  o2_pct: nullableNum(0, 100),
  flow_cm_s: nullableNum(0),
  pressure_kpa: nullableNum(0),
  ignition_method: nullableText,
  outcome: OutcomeSchema,
  spread_rate_mm_s: nullableNum(0),
  key_observation_quote: z.string().trim().min(1),
  observation_summary: nullableText,
  source_title: z.string().trim().min(1),
  source_url: z.url(),
  psi_investigation: nullableText,
  source_page: z.number().int().positive().nullable(),
  source_figure: nullableText,
  source_table: nullableText,
  source_section: nullableText,
  ntrs_id: nullableText,
  doi: nullableText,
  media_url: z.url().nullable(),
  telemetry: TelemetrySchema.nullable(),
  /** Card is PUBLIC only when non-null (enforced by RLS, §10). */
  verified_by: nullableText,
  notes: nullableText,
});
export type ExperimentInsert = z.infer<typeof ExperimentInsertSchema>;

export const ExperimentSchema = ExperimentInsertSchema.extend({
  id: z.uuid(),
  created_at: z.string(),
});
export type Experiment = z.infer<typeof ExperimentSchema>;

/** The four continuous parameters matching runs over (§5b). */
export const CONTINUOUS_PARAMS = ['o2_pct', 'flow_cm_s', 'thickness_mm', 'pressure_kpa'] as const;
export type ContinuousParam = (typeof CONTINUOUS_PARAMS)[number];

// ---------------------------------------------------------------------------
// Scenario (LLM Job A output, §7.2) — user confirms before matching runs
// ---------------------------------------------------------------------------
export const ParsedScenarioSchema = z.object({
  domain: DomainSchema,
  /** The user's own phrase. The deterministic resolver (§5a) maps it — never the LLM. */
  fuel_material_raw: z.string().nullable(),
  fuel_form: FuelFormSchema.nullable(),
  thickness_mm: nullableNum(0),
  o2_pct: nullableNum(0, 100),
  flow_cm_s: nullableNum(0),
  pressure_kpa: nullableNum(0),
});
export type ParsedScenario = z.infer<typeof ParsedScenarioSchema>;

// ---------------------------------------------------------------------------
// Matching (§5) — produced by deterministic code only (Part 2)
// ---------------------------------------------------------------------------
/** ✓ same/exact · ≈ close/class · ≠ different · ⚠ not reported · ∅ untested · ⇥ outside catalog range */
export const ChipStatusSchema = z.enum([
  'exact',
  'class',
  'same',
  'close',
  'different',
  'not_reported',
  'untested',
  'outside_range',
]);
export type ChipStatus = z.infer<typeof ChipStatusSchema>;

export const MatchChipsSchema = z.object({
  fuel: z.enum(['exact', 'class']),
  o2_pct: ChipStatusSchema,
  flow_cm_s: ChipStatusSchema,
  thickness_mm: ChipStatusSchema,
  pressure_kpa: ChipStatusSchema,
});
export type MatchChips = z.infer<typeof MatchChipsSchema>;

export const MatchResultSchema = z.object({
  experiment: ExperimentSchema,
  chips: MatchChipsSchema,
  /** "Matched N of M parameters." */
  scored_params: z.number().int().min(0),
  total_params: z.number().int().min(0),
  /** INTERNAL sort order only — never rendered (§5c). */
  score: z.number().min(0).max(1),
  /** true when 0 continuous params scored → "weak evidence — material match only". */
  weak_evidence: z.boolean(),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;

// ---------------------------------------------------------------------------
// Claims + briefing (LLM Job B, §7.3–7.4)
// ---------------------------------------------------------------------------
export const ClaimClassificationSchema = z.enum(['OBSERVED', 'SUPPORTED', 'UNTESTED']);
export type ClaimClassification = z.infer<typeof ClaimClassificationSchema>;

/** Evidence IDs are positional in the retrieved context: E1..E5. */
export const EvidenceIdSchema = z.string().regex(/^E[1-9]\d*$/);

export const ClaimSchema = z.object({
  classification: ClaimClassificationSchema,
  text: z.string().trim().min(1),
  evidence_ids: z.array(EvidenceIdSchema),
});
export type Claim = z.infer<typeof ClaimSchema>;

/** Raw shape the LLM must return; validated server-side before anything renders. */
export const LlmBriefingSchema = z.object({ claims: z.array(ClaimSchema) });

export const BriefingSchema = z.object({
  /** 'fallback' → "Briefing unavailable — showing matched evidence only". */
  status: z.enum(['ok', 'fallback']),
  claims: z.array(ClaimSchema),
  /** Rendered as "N statements withheld (failed evidence validation)". */
  withheld_count: z.number().int().min(0),
  /** E1..Ek → experiment id, so citation chips can scroll to the card. */
  evidence: z.array(z.object({ evidence_id: EvidenceIdSchema, experiment_id: z.uuid() })),
  provider: z.enum(['groq', 'gemini', 'cache']).nullable(),
});
export type Briefing = z.infer<typeof BriefingSchema>;

// ---------------------------------------------------------------------------
// Extraction (LLM Job C, §7.6) — a DRAFT for a curator, never public
// ---------------------------------------------------------------------------
/** Models say `null` for "not stated"; a draft just omits those keys. */
const dropNulls = (v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null))
    : v;

export const ExtractDraftSchema = z.preprocess(
  dropNulls,
  ExperimentInsertSchema.partial().extend({
    /** Verbatim quote (original units) backing each numeric field the model filled. */
    field_quotes: z.record(z.string(), z.string()).default({}),
  }),
);
export type ExtractDraft = z.infer<typeof ExtractDraftSchema>;

// ---------------------------------------------------------------------------
// API contracts (request/response bodies) — final
// ---------------------------------------------------------------------------
export const ParseScenarioRequestSchema = z.object({ text: z.string().trim().min(1).max(2000) });
export const ParseScenarioResponseSchema = z.object({
  scenario: ParsedScenarioSchema,
  provider: z.enum(['groq', 'gemini']),
});

export const SynthesizeRequestSchema = z.object({
  scenario: ParsedScenarioSchema,
  /** Top-k (k ≤ 5) match ids in rank order. The server re-reads them as verified rows. */
  experiment_ids: z.array(z.uuid()).min(1).max(5),
});
export const SynthesizeResponseSchema = BriefingSchema;

export const ExtractRequestSchema = z.object({
  text: z.string().trim().min(20).max(30000),
  source_url: z.url().optional(),
});
export const ExtractResponseSchema = z.object({ draft: ExtractDraftSchema, provider: z.enum(['groq', 'gemini']) });

export const CurateWriteRequestSchema = ExperimentInsertSchema;
export const CurateWriteResponseSchema = z.object({ experiment: ExperimentSchema });

export const ApiErrorCodeSchema = z.enum([
  'invalid_request',
  'unauthorized',
  'rate_limited',
  'not_configured',
  'llm_unavailable',
  'db_error',
  'internal',
]);
export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
