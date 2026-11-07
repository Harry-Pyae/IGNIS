/**
 * Contract fixtures (round 2, B) — the edge cases Coder A (engine) and Coder B (console) build against.
 * Every object is validated against its schema in tests/fixtures.test.ts; coverage fixtures
 * are re-derived with computeCoverage() there, so they cannot drift from the real rules.
 * Scores inside MatchResults are illustrative (internal sort order only, never rendered);
 * the engine's own tests own the exact scoring numbers. OWNER: Coder A.
 */
import { COPY } from './copy.js';
import type { Briefing, CoverageResult, Experiment, MatchResult, ResolvedScenario } from './types.js';

const base = {
  created_at: '2026-11-07T00:00:00Z',
  updated_at: '2026-11-07T00:00:00Z',
  verified_at: '2026-11-08T00:00:00Z',
  domain: 'solid_flammability',
  fuel_material: 'cotton_fiberglass',
  material_class: 'fabric',
  fuel_form: 'fabric',
  thickness_mm: 0.32,
  pressure_kpa: 101.325,
  ignition_method: 'Kanthal hot wire at fuel sample leading edge (concurrent flow)',
  spread_rate_mm_s: null,
  observation_summary: null,
  source_title: 'Concurrent flame growth, spread and extinction over composite fabric samples in low speed purely forced flow in microgravity',
  source_url: 'https://ntrs.nasa.gov/citations/20150008962',
  source_table: 'Appendix: Test summary of flat SIBAL fabrics in concurrent flow in BASS and BASS II',
  source_section: '3. Results and Discussion',
  ntrs_id: '20150008962',
  doi: null,
  media_url: null,
  telemetry: null,
  verified_by: 'Example Reviewer',
  notes: null,
} as const;

/** The three seed cards, as they will look once R1 publishes them. */
export const SEED_CARDS: Experiment[] = [
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000001',
    campaign: 'BASS',
    test_id: 'BASS GMT96-T7',
    o2_pct: 21,
    flow_cm_s: 10,
    outcome: 'sustained',
    key_observation_quote:
      'At about 19s, the flame reached a limiting constant length and a steady spread rate relative to the laboratory [11]. This steady spread state lasted for around 9s.',
    psi_investigation: 'BASS',
    source_page: 3,
    source_figure: 'Figure 2',
    condition_changes: null,
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000002',
    campaign: 'BASS',
    test_id: 'BASS GMT96-T8',
    o2_pct: 21,
    flow_cm_s: 5,
    outcome: 'sustained',
    key_observation_quote:
      'Because the flow speed is lower, it took more than 60s to burn the whole sample. Steady spread time lasts for about 21s, much longer than the 10 cm/s flow case.',
    psi_investigation: 'BASS',
    source_page: 4,
    source_figure: 'Figure 3',
    condition_changes: null,
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000003',
    campaign: 'BASS-II',
    test_id: 'BASS-II GMT45-T4',
    o2_pct: 18.7,
    flow_cm_s: 2.2,
    outcome: 'extinguished',
    key_observation_quote:
      'As shown in Fig. 5, both the flame length and flame width continued to decrease approaching a circular-shaped blue flame seen from the top. The size of the flame continues to shrink until extinction is reached.',
    psi_investigation: 'BASS-II',
    source_page: 5,
    source_figure: 'Figures 5 and 6',
    condition_changes: [
      {
        parameter: 'flow_cm_s',
        from: 10,
        to: 2.2,
        stored: 'final_held',
        note: 'ignited at 10 cm/s, reduced incrementally after ignition to 2.2 cm/s and held for the remainder of the test (p.5)',
      },
    ],
  },
];
const [T7, T8, T4] = SEED_CARDS as [Experiment, Experiment, Experiment];

const fabricScenario: ResolvedScenario = {
  domain: 'solid_flammability',
  material: { status: 'resolved', raw: 'crew clothing', fuel_material: 'cotton_fiberglass', material_class: 'fabric', via: 'alias' },
  fuel_form: 'fabric',
  thickness_mm: null,
  o2_pct: 21,
  flow_cm_s: 10,
  pressure_kpa: null,
};

const emptyCoverage = (revision: string): CoverageResult => ({
  catalog_revision: revision,
  eligible_catalog_count: 0,
  retrieved_count: 0,
  params: [],
  gaps: [],
});

export const FIXTURES = {
  /** "cabin wall" outside a preset is ambiguous → picker, never auto-PMMA (§5a). Synthesis rejects it. */
  unresolvedMaterial: {
    scenario: {
      ...fabricScenario,
      material: { status: 'unresolved', raw: 'cabin wall', reason: 'ambiguous', candidates: ['PMMA'] },
    } satisfies ResolvedScenario,
  },

  /** PMMA scenario vs a fabric-only catalog: nothing passes the gates. */
  noEligibleRows: {
    scenario: {
      ...fabricScenario,
      material: { status: 'resolved', raw: 'cabin wall panel', fuel_material: 'PMMA', material_class: 'thermoplastic', via: 'preset' },
      fuel_form: 'flat_sheet',
    } satisfies ResolvedScenario,
    catalog: SEED_CARDS,
    matches: [] as MatchResult[],
    coverage: {
      ...emptyCoverage('fixture-rev'),
      params: [
        { parameter: 'o2_pct', state: 'untested_in_catalog', scenario_value: 21, catalog_min: null, catalog_max: null, retrieved_reporting: 0 },
        { parameter: 'flow_cm_s', state: 'untested_in_catalog', scenario_value: 10, catalog_min: null, catalog_max: null, retrieved_reporting: 0 },
        { parameter: 'thickness_mm', state: 'not_specified', scenario_value: null, catalog_min: null, catalog_max: null, retrieved_reporting: 0 },
        { parameter: 'pressure_kpa', state: 'not_specified', scenario_value: null, catalog_min: null, catalog_max: null, retrieved_reporting: 0 },
      ],
      gaps: [{ id: 'G1', scope: 'catalog', kind: 'no_eligible_evidence', parameter: null, message: COPY.absence }],
    } satisfies CoverageResult,
  },

  /** A card that does not report thickness while the scenario states it → ⚠ not reported. */
  missingData: {
    scenario: { ...fabricScenario, thickness_mm: 0.32 } satisfies ResolvedScenario,
    match: {
      experiment: { ...T8, thickness_mm: null },
      chips: { fuel: 'exact', o2_pct: 'same', flow_cm_s: 'different', thickness_mm: 'not_reported', pressure_kpa: 'not_specified' },
      scored_params: 2,
      total_params: 4,
      score: 0.82,
      weak_evidence: false,
    } satisfies MatchResult,
  },

  /** All seeds share thickness 0.32 mm + 101.325 kPa: zero range → excluded from score, chip by equality. */
  zeroRange: {
    scenario: { ...fabricScenario, thickness_mm: 0.32, pressure_kpa: 101.325 } satisfies ResolvedScenario,
    catalog: SEED_CARDS,
    match: {
      experiment: T7,
      chips: { fuel: 'exact', o2_pct: 'same', flow_cm_s: 'same', thickness_mm: 'same', pressure_kpa: 'same' },
      scored_params: 2, // o2 + flow only — thickness and pressure cannot discriminate
      total_params: 4,
      score: 1,
      weak_evidence: false,
    } satisfies MatchResult,
  },

  /** O₂ 32 % vs a catalog spanning 18.7–21 % → ⇥ outside range, never clamped. */
  outsideRange: {
    scenario: { ...fabricScenario, o2_pct: 32 } satisfies ResolvedScenario,
    catalog: SEED_CARDS,
    match: {
      experiment: T7,
      chips: { fuel: 'exact', o2_pct: 'outside_range', flow_cm_s: 'same', thickness_mm: 'not_specified', pressure_kpa: 'not_specified' },
      scored_params: 2,
      total_params: 4,
      score: 0.56,
      weak_evidence: false,
    } satisfies MatchResult,
  },

  /** Retry still failed for two claims: they are withheld, visibly. */
  withheldClaims: {
    briefing: {
      status: 'ok',
      claims: [
        {
          classification: 'OBSERVED',
          text: 'BASS-II GMT45-T4: Airflow 2.2 cm/s, outcome extinguished (Airflow changed 10 → 2.2 cm/s during the run: ignited at 10 cm/s, reduced incrementally after ignition to 2.2 cm/s and held for the remainder of the test (p.5)).',
          evidence_ids: ['E2'],
          refs: [
            { evidence_id: 'E2', field: 'flow_cm_s', value: 2.2, unit: 'cm/s' },
            { evidence_id: 'E2', field: 'outcome', value: 'extinguished', unit: null },
          ],
          gap_ids: [],
        },
        {
          classification: 'SUPPORTED',
          text: 'Across the two tests, the run held at 2.2 cm/s extinguished while the 10 cm/s run was sustained.',
          evidence_ids: ['E1', 'E2'],
          refs: [
            { evidence_id: 'E1', field: 'flow_cm_s', value: 10, unit: 'cm/s' },
            { evidence_id: 'E1', field: 'outcome', value: 'sustained', unit: null },
            { evidence_id: 'E2', field: 'flow_cm_s', value: 2.2, unit: 'cm/s' },
            { evidence_id: 'E2', field: 'outcome', value: 'extinguished', unit: null },
          ],
          gap_ids: [],
        },
      ],
      withheld_count: 2,
      evidence: [
        { evidence_id: 'E1', experiment_id: T7.id },
        { evidence_id: 'E2', experiment_id: T4.id },
      ],
      coverage: emptyCoverage('fixture-rev'),
      catalog_revision: 'fixture-rev',
      provider: 'gemini',
    } satisfies Briefing,
  },

  /** Every provider failed twice: deterministic evidence-only briefing, no SUPPORTED prose. */
  totalProviderFailure: {
    briefing: {
      status: 'fallback',
      claims: [
        {
          classification: 'OBSERVED',
          text: 'BASS GMT96-T7: outcome sustained, Oxygen 21 %, Airflow 10 cm/s, Thickness 0.32 mm, Pressure 101.325 kPa.',
          evidence_ids: ['E1'],
          refs: [
            { evidence_id: 'E1', field: 'outcome', value: 'sustained', unit: null },
            { evidence_id: 'E1', field: 'o2_pct', value: 21, unit: '%' },
            { evidence_id: 'E1', field: 'flow_cm_s', value: 10, unit: 'cm/s' },
            { evidence_id: 'E1', field: 'thickness_mm', value: 0.32, unit: 'mm' },
            { evidence_id: 'E1', field: 'pressure_kpa', value: 101.325, unit: 'kPa' },
          ],
          gap_ids: [],
        },
      ],
      withheld_count: 0,
      evidence: [{ evidence_id: 'E1', experiment_id: T7.id }],
      coverage: emptyCoverage('fixture-rev'),
      catalog_revision: 'fixture-rev',
      provider: null,
    } satisfies Briefing,
  },
} as const;
