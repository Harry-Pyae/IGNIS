/**
 * IGNIS shared contracts. The engine (Coder A) and the console (Coder B) code against this file.
 * OWNER: Coder A. Changes go through a request to Coder A, never edited on the console/features branch.
 *
 * Mirrors supabase/migrations/0001_init.sql + 0002_round2.sql (IGNIS_BUILD_PLAN.md §4)
 * and the matching / claim / coverage contracts (§5–§7, docs/DECISIONS-ROUND2.md).
 * Fixtures for every edge case below: tests/fixtures/contracts.ts.
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

/** The four continuous parameters matching runs over (§5b). */
export const CONTINUOUS_PARAMS = ['o2_pct', 'flow_cm_s', 'thickness_mm', 'pressure_kpa'] as const;
export const ContinuousParamSchema = z.enum(CONTINUOUS_PARAMS);
export type ContinuousParam = (typeof CONTINUOUS_PARAMS)[number];

/** Canonical (normalized) unit per numeric field. Claims and copy must use exactly these. */
export const FIELD_UNITS = {
  o2_pct: '%',
  flow_cm_s: 'cm/s',
  thickness_mm: 'mm',
  pressure_kpa: 'kPa',
  spread_rate_mm_s: 'mm/s',
} as const;
export const PARAM_LABELS: Record<ContinuousParam, string> = {
  o2_pct: 'Oxygen',
  flow_cm_s: 'Airflow',
  thickness_mm: 'Thickness',
  pressure_kpa: 'Pressure',
};

// ---------------------------------------------------------------------------
// Changing conditions (round 2, A2): a test whose condition changed during the run
// must never be stored or narrated as a constant-condition test.
// ---------------------------------------------------------------------------
export const ConditionChangeSchema = z.object({
  parameter: ContinuousParamSchema,
  /** Value at ignition / start of the run, in the canonical unit. */
  from: z.number(),
  /** Final value, in the canonical unit. */
  to: z.number(),
  /** Which value the scalar column holds. Matching MUST NOT treat this parameter as constant. */
  stored: z.enum(['initial', 'final_held', 'final']),
  /** Verbatim-anchored explanation with locator, e.g. 'reduced incrementally after ignition, held (p.5)'. */
  note: z.string().trim().min(1),
});
export type ConditionChange = z.infer<typeof ConditionChangeSchema>;

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
  /** Changing conditions during the run (0002). null = conditions reported as constant. */
  condition_changes: z.array(ConditionChangeSchema).min(1).nullable().default(null),
  /** Card is PUBLIC only when non-null (RLS, §10). Set ONLY by the publish action, never by drafts or models. */
  verified_by: nullableText,
  notes: nullableText,
});
export type ExperimentInsert = z.infer<typeof ExperimentInsertSchema>;

export const ExperimentSchema = ExperimentInsertSchema.extend({
  id: z.uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  verified_at: z.string().nullable(),
});
export type Experiment = z.infer<typeof ExperimentSchema>;

// ---------------------------------------------------------------------------
// Scenario: parsed (LLM Job A, §7.2) → resolved (deterministic §5a, user-confirmed)
// The PUBLIC scenario contract is solid_flammability only (decision A4).
// ---------------------------------------------------------------------------
export const SolidDomainSchema = z.literal('solid_flammability');

export const ParsedScenarioSchema = z.object({
  domain: SolidDomainSchema,
  /** The user's own phrase. The deterministic resolver (§5a) maps it — never the LLM. */
  fuel_material_raw: z.string().nullable(),
  fuel_form: FuelFormSchema.nullable(),
  thickness_mm: nullableNum(0),
  o2_pct: nullableNum(0, 100),
  flow_cm_s: nullableNum(0),
  pressure_kpa: nullableNum(0),
});
export type ParsedScenario = z.infer<typeof ParsedScenarioSchema>;

/** Output of the engine's alias resolver. The raw phrase is always preserved. */
export const ResolvedMaterialSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('resolved'),
    raw: z.string().nullable(),
    fuel_material: z.string().trim().min(1),
    material_class: MaterialClassSchema,
    /** preset = explicit scenario preset mapping · alias = material dictionary · picker = user chose it */
    via: z.enum(['preset', 'alias', 'picker']),
  }),
  z.object({
    status: z.literal('unresolved'),
    raw: z.string().nullable(),
    reason: z.enum(['unknown', 'ambiguous', 'missing']),
    /** Catalog materials the picker may offer. Never auto-selected. */
    candidates: z.array(z.string()),
  }),
]);
export type ResolvedMaterial = z.infer<typeof ResolvedMaterialSchema>;

export const ResolvedScenarioSchema = ParsedScenarioSchema.omit({ fuel_material_raw: true }).extend({
  material: ResolvedMaterialSchema,
});
export type ResolvedScenario = z.infer<typeof ResolvedScenarioSchema>;

// ---------------------------------------------------------------------------
// Gates (§5b stage 1) — src/lib/gates.ts is the ONE implementation (the engine extends it)
// ---------------------------------------------------------------------------
export const GateReasonSchema = z.enum(['domain_mismatch', 'material_unresolved', 'material_mismatch', 'form_incompatible']);
export type GateReason = z.infer<typeof GateReasonSchema>;

export const GateResultSchema = z.object({
  experiment_id: z.uuid(),
  eligible: z.boolean(),
  /** Empty when eligible. Every failing gate is listed, not just the first. */
  reasons: z.array(GateReasonSchema),
  /** exact = same fuel_material · class = same material_class (only meaningful when eligible). */
  fuel_match: z.enum(['exact', 'class']).nullable(),
});
export type GateResult = z.infer<typeof GateResultSchema>;

// ---------------------------------------------------------------------------
// Matching (§5) — produced by deterministic code only (the engine, Coder A)
//
// SCORING SEMANTICS (frozen; fixtures in tests/fixtures/contracts.ts):
// • Range population: min/max of p over the GATE-SURVIVING verified catalog cards that
//   report p (non-null). The same population drives outside-range detection.
// • Scenario value null            → chip 'not_specified', p excluded from the score.
// • No eligible card reports p     → chip 'untested', p excluded (catalog has no evidence).
// • Scenario outside [min, max]    → chip 'outside_range' (wins over everything below),
//                                    p still scored with d capped at 1; never clamped.
// • This card's value is null       → chip 'not_reported', p excluded for this card.
// • Zero range (max === min): p cannot discriminate between cards, so it is EXCLUDED
//   from the score (no division by zero). Chip is 'same' when the scenario equals the
//   value, otherwise the scenario is outside [v, v] → 'outside_range'.
// • Else d = |scen − exp| / (max − min): same ≤ 0.05, close ≤ 0.20, different > 0.20.
// • A condition_changes entry for p: chip computed against the stored scalar, and the
//   card's qualifier must be rendered next to it — never shown as a constant-condition test.
// • scored_params = params contributing to the score; total_params = 4.
//   unscored = why each other param is excluded (decision 10: the summary names every reason).
//   scored_params === 0 → weak_evidence (rendered "Weak evidence — compared on 0 of 4 parameters · …"),
//   ranked after every non-weak match.
// • Ties: score desc → scored_params desc → exact fuel before class → test_id asc → id asc.
// ---------------------------------------------------------------------------
/**
 * ✓ same/exact · ≈ close/class · ≠ different · ⚠ not reported (card) ·
 * ∅ untested (no catalog evidence) · ⇥ outside catalog range · – not specified (scenario)
 */
export const ChipStatusSchema = z.enum([
  'exact',
  'class',
  'same',
  'close',
  'different',
  'not_reported',
  'untested',
  'outside_range',
  'not_specified',
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

/** Why each excluded continuous param is excluded; counts sum to total_params − scored_params. */
export const UnscoredCountsSchema = z.object({
  /** scenario value is null */
  not_specified: z.number().int().min(0),
  /** zero range: every eligible card reports the same value, so it cannot discriminate */
  identical: z.number().int().min(0),
  /** this card's value is null */
  not_reported: z.number().int().min(0),
  /** no eligible card reports the param */
  none_reported: z.number().int().min(0),
});
export type UnscoredCounts = z.infer<typeof UnscoredCountsSchema>;

export const MatchResultSchema = z.object({
  experiment: ExperimentSchema,
  chips: MatchChipsSchema,
  /** "Compared on N of M parameters · <reasons>" (decision 10). */
  scored_params: z.number().int().min(0),
  unscored: UnscoredCountsSchema,
  total_params: z.number().int().min(0),
  /** INTERNAL sort order only — never rendered (§5c). */
  score: z.number().min(0).max(1),
  /** true when 0 continuous params scored → "Weak evidence — compared on 0 of 4 parameters · …". */
  weak_evidence: z.boolean(),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;

// ---------------------------------------------------------------------------
// Coverage (A4) — deterministic; src/lib/coverage.ts. UNTESTED copy renders from this.
// ---------------------------------------------------------------------------
export const ParamCoverageStateSchema = z.enum([
  'covered', // scenario value inside the eligible catalog range and ≥1 retrieved card reports it
  'not_reported_in_matches', // catalog has it, none of the retrieved cards report it
  'outside_catalog_range', // scenario value beyond eligible catalog min/max
  'untested_in_catalog', // no eligible verified card reports this parameter at all
  'not_specified', // the scenario leaves it null — nothing to check
]);
export type ParamCoverageState = z.infer<typeof ParamCoverageStateSchema>;

export const ParamCoverageSchema = z.object({
  parameter: ContinuousParamSchema,
  state: ParamCoverageStateSchema,
  scenario_value: z.number().nullable(),
  catalog_min: z.number().nullable(),
  catalog_max: z.number().nullable(),
  /** How many retrieved (top-k) cards report this parameter. */
  retrieved_reporting: z.number().int().min(0),
});
export type ParamCoverage = z.infer<typeof ParamCoverageSchema>;

export const CoverageGapSchema = z.object({
  /** Stable within one CoverageResult: G1..Gn. The LLM may only reference these. */
  id: z.string().regex(/^G[1-9]\d*$/),
  /** catalog = the whole eligible verified catalog · retrieved = only the top-k matches. */
  scope: z.enum(['catalog', 'retrieved']),
  kind: z.enum(['no_eligible_evidence', 'untested_in_catalog', 'outside_catalog_range', 'not_reported_in_matches']),
  parameter: ContinuousParamSchema.nullable(),
  /** Deterministic approved copy — rendered verbatim, never rewritten by the LLM. */
  message: z.string().min(1),
});
export type CoverageGap = z.infer<typeof CoverageGapSchema>;

export const CoverageResultSchema = z.object({
  catalog_revision: z.string(),
  eligible_catalog_count: z.number().int().min(0),
  retrieved_count: z.number().int().min(0),
  params: z.array(ParamCoverageSchema),
  gaps: z.array(CoverageGapSchema),
});
export type CoverageResult = z.infer<typeof CoverageResultSchema>;

// ---------------------------------------------------------------------------
// Claims + briefing (LLM Job B, §7.3–7.4; strengthened in round 2, A3)
// ---------------------------------------------------------------------------
export const ClaimClassificationSchema = z.enum(['OBSERVED', 'SUPPORTED', 'UNTESTED']);
export type ClaimClassification = z.infer<typeof ClaimClassificationSchema>;

/** Evidence IDs are positional in the retrieved context: E1..E5. */
export const EvidenceIdSchema = z.string().regex(/^E[1-9]\d*$/);

/** Card fields a claim may reference as a fact. */
export const FACT_FIELDS = [
  'outcome',
  'o2_pct',
  'flow_cm_s',
  'thickness_mm',
  'pressure_kpa',
  'spread_rate_mm_s',
  'fuel_material',
  'material_class',
  'fuel_form',
] as const;
export const FactFieldSchema = z.enum(FACT_FIELDS);
export type FactField = (typeof FACT_FIELDS)[number];

/** A typed reference: "card E1 says field = value [unit]". Checked against the CITED card. */
export const FactRefSchema = z.object({
  evidence_id: EvidenceIdSchema,
  field: FactFieldSchema,
  value: z.union([z.number(), z.string()]),
  /** FIELD_UNITS[field] for numeric fields; null for categorical fields. */
  unit: z.string().nullable(),
});
export type FactRef = z.infer<typeof FactRefSchema>;

export const ClaimSchema = z.object({
  classification: ClaimClassificationSchema,
  text: z.string().trim().min(1),
  evidence_ids: z.array(EvidenceIdSchema),
  /** Required (≥1) on OBSERVED and SUPPORTED. Every number/outcome in `text` must match one. */
  refs: z.array(FactRefSchema).default([]),
  /** Required (≥1) on UNTESTED: ids from the server's CoverageResult. Nothing else may be claimed absent. */
  gap_ids: z.array(z.string()).default([]),
});
export type Claim = z.infer<typeof ClaimSchema>;

/** Raw shape the LLM must return; validated server-side before anything renders. */
export const LlmBriefingSchema = z.object({ claims: z.array(ClaimSchema) });

export const BriefingSchema = z.object({
  /** 'fallback' → "Briefing unavailable — showing matched evidence only". */
  status: z.enum(['ok', 'fallback']),
  /**
   * OBSERVED text is rendered by the server from validated refs (never model prose).
   * SUPPORTED keeps model text (visibly interpretive) after validation.
   * UNTESTED text is the deterministic gap message. On fallback, OBSERVED is one
   * deterministic claim per evidence card and no SUPPORTED claims are shown.
   */
  claims: z.array(ClaimSchema),
  /** Rendered as "N statements withheld (failed evidence validation)". */
  withheld_count: z.number().int().min(0),
  /** E1..Ek → experiment id, so citation chips can scroll to the card. */
  evidence: z.array(z.object({ evidence_id: EvidenceIdSchema, experiment_id: z.uuid() })),
  coverage: CoverageResultSchema,
  catalog_revision: z.string(),
  provider: z.enum(['groq', 'gemini', 'cache']).nullable(),
});
export type Briefing = z.infer<typeof BriefingSchema>;

// ---------------------------------------------------------------------------
// Extraction (LLM Job C, §7.6) — a DRAFT for a curator, never public (round 2, A1)
// Allowlisted scientific + provenance fields ONLY. No verified_by, domain, source_url,
// media or telemetry: the model can never populate the verifier or publication metadata.
// Every key is always present (null when not stated) so a new extraction fully
// replaces the previous one — nothing leaks from paper A into paper B.
// ---------------------------------------------------------------------------
const S = ExperimentInsertSchema.shape;
export const ExtractDraftSchema = z.object({
  campaign: S.campaign.nullable().default(null),
  test_id: S.test_id.nullable().default(null),
  fuel_material: S.fuel_material.nullable().default(null),
  material_class: S.material_class.nullable().default(null),
  fuel_form: S.fuel_form.nullable().default(null),
  thickness_mm: S.thickness_mm.default(null),
  o2_pct: S.o2_pct.default(null),
  flow_cm_s: S.flow_cm_s.default(null),
  pressure_kpa: S.pressure_kpa.default(null),
  ignition_method: S.ignition_method.default(null),
  outcome: S.outcome.nullable().default(null),
  spread_rate_mm_s: S.spread_rate_mm_s.default(null),
  key_observation_quote: S.key_observation_quote.nullable().default(null),
  observation_summary: S.observation_summary.default(null),
  source_title: S.source_title.nullable().default(null),
  source_page: S.source_page.default(null),
  source_figure: S.source_figure.default(null),
  source_table: S.source_table.default(null),
  source_section: S.source_section.default(null),
  ntrs_id: S.ntrs_id.default(null),
  doi: S.doi.default(null),
  /** field name → verbatim quote (original units) backing that value. Required for every numeric field. */
  field_quotes: z.record(z.string(), z.string().trim().min(1)).default({}),
});
export type ExtractDraft = z.infer<typeof ExtractDraftSchema>;
export const EXTRACT_FIELDS = Object.keys(ExtractDraftSchema.shape).filter((k) => k !== 'field_quotes') as (keyof Omit<
  ExtractDraft,
  'field_quotes'
>)[];
export const EXTRACT_NUMERIC_FIELDS = ['thickness_mm', 'o2_pct', 'flow_cm_s', 'pressure_kpa', 'spread_rate_mm_s'] as const;

export const DroppedFieldSchema = z.object({
  field: z.string(),
  reason: z.enum(['missing_quote', 'quote_not_in_excerpt']),
});

// ---------------------------------------------------------------------------
// Curation (round 2, A2): draft → review → publish. Publication = a named human.
// ---------------------------------------------------------------------------
/** What curators edit. verified_by is NOT part of a record — only the publish action sets it. */
export const CurateRecordSchema = ExperimentInsertSchema.omit({ verified_by: true });
export type CurateRecord = z.infer<typeof CurateRecordSchema>;

export const CardStatusSchema = z.enum(['draft', 'published']);

export const CurateListItemSchema = z.object({
  id: z.uuid(),
  campaign: z.string(),
  test_id: z.string(),
  source_title: z.string(),
  status: CardStatusSchema,
  verified_by: z.string().nullable(),
  updated_at: z.string(),
});
export type CurateListItem = z.infer<typeof CurateListItemSchema>;

// ---------------------------------------------------------------------------
// Catalog summary (public; SQL function catalog_stats(), counts only)
// ---------------------------------------------------------------------------
export const CatalogStatsSchema = z.object({
  verified: z.number().int().min(0),
  in_review: z.number().int().min(0),
  campaigns: z.array(z.string()),
  last_updated: z.string().nullable(),
  /** Changes whenever a verified card is added, corrected, or unpublished. Part of the briefing-cache key. */
  revision: z.string(),
});
export type CatalogStats = z.infer<typeof CatalogStatsSchema>;

// ---------------------------------------------------------------------------
// API contracts (request/response bodies) — final
// ---------------------------------------------------------------------------
export const ParseScenarioRequestSchema = z.object({ text: z.string().trim().min(1).max(2000) });
export const ParseScenarioResponseSchema = z.object({
  scenario: ParsedScenarioSchema,
  provider: z.enum(['groq', 'gemini']),
});

export const SynthesizeRequestSchema = z.object({
  /** The user-CONFIRMED scenario after alias resolution. Unresolved material is rejected. */
  scenario: ResolvedScenarioSchema,
  /** Top-k (k ≤ 5) match ids in rank order, no duplicates. Re-read and re-gated on the server. */
  experiment_ids: z
    .array(z.uuid())
    .min(1)
    .max(5)
    .refine((ids) => new Set(ids).size === ids.length, 'experiment_ids must not contain duplicates'),
});
export const SynthesizeResponseSchema = BriefingSchema;

export const ExtractRequestSchema = z.object({
  text: z.string().trim().min(20).max(30000),
});
export const ExtractResponseSchema = z.object({
  draft: ExtractDraftSchema,
  /** Fields the server nulled because their quote was missing or not found in the excerpt. */
  dropped: z.array(DroppedFieldSchema),
  provider: z.enum(['groq', 'gemini']),
});

export const CurateWriteRequestSchema = z.discriminatedUnion('action', [
  /** Create (no id) or update (id) a DRAFT. Saving a published card un-publishes it until re-verified. */
  z.object({ action: z.literal('save_draft'), id: z.uuid().optional(), record: CurateRecordSchema }),
  /** Verify & publish: the named human reviewer takes responsibility. */
  z.object({
    action: z.literal('publish'),
    id: z.uuid().optional(),
    record: CurateRecordSchema,
    verified_by: z.string().trim().min(1),
  }),
]);
export type CurateWriteRequest = z.infer<typeof CurateWriteRequestSchema>;
export const CurateWriteResponseSchema = z.object({ experiment: ExperimentSchema });

export const CurateListResponseSchema = z.object({ items: z.array(CurateListItemSchema) });

export const ApiErrorCodeSchema = z.enum([
  'invalid_request',
  'ineligible_evidence',
  'duplicate_experiment',
  'unauthorized',
  'not_found',
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
    /** llm_unavailable only, and only for `x-ignis-debug: 1` + a valid curator secret. Never key material. */
    providers_tried: z
      .array(
        z.object({
          provider: z.enum(['groq', 'gemini']),
          failure: z.string(),
          status: z.number().int().nullable(),
          elapsed_ms: z.number().min(0),
        }),
      )
      .optional(),
  }),
});
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
