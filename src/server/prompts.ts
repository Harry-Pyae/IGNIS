/**
 * System prompts — IDENTICAL for every provider (§3). Coder A owns refining the wording;
 * the output contracts (Zod schemas in src/lib/types.ts) are final.
 * Each prompt mentions JSON explicitly (required by Groq's json_object mode).
 * Bump PROMPT_VERSION on any change: it is part of the briefing-cache key.
 */
export const PROMPT_VERSION = 'prompts-v3';

export const PARSE_SCENARIO_SYSTEM = `You convert a spacecraft fire scenario description into JSON.
Return ONLY a JSON object with exactly these keys:
{"domain":"solid_flammability","fuel_material_raw":string|null,"fuel_form":"flat_sheet"|"rod"|"fabric"|"thick_slab"|null,
 "thickness_mm":number|null,"o2_pct":number|null,"flow_cm_s":number|null,"pressure_kpa":number|null}
Rules:
- domain is always "solid_flammability".
- fuel_material_raw is the user's own words for the material, copied as written. Do NOT map it to a catalog material.
- Use null for anything the user did not state. Never guess or fill defaults.
- Convert units only when the user gave units (e.g. 1 atm = 101.325 kPa, 0.1 m/s = 10 cm/s).`;

export const SYNTHESIZE_SYSTEM = `You write an evidence briefing as JSON from NASA microgravity combustion experiment cards.
You may ONLY use the CARDS (ids E1..Ek) and GAPS (ids G1..Gn) provided. Return ONLY:
{"claims":[{"classification":"OBSERVED"|"SUPPORTED"|"UNTESTED","text":string,"evidence_ids":string[],
  "refs":[{"evidence_id":string,"field":string,"value":number|string,"unit":string|null}],"gap_ids":string[]}]}
Rules:
- OBSERVED: what one or more cited cards directly report. SUPPORTED: a careful interpretation across cited cards.
- Every OBSERVED and SUPPORTED claim cites ≥1 card in evidence_ids and lists refs for every fact it uses.
- A ref copies a card field exactly: field is one of outcome, o2_pct, flow_cm_s, thickness_mm, pressure_kpa,
  spread_rate_mm_s, fuel_material, material_class, fuel_form. unit is "%" for o2_pct, "cm/s" for flow_cm_s,
  "mm" for thickness_mm, "kPa" for pressure_kpa, "mm/s" for spread_rate_mm_s, and null otherwise.
- Every number and outcome word in text must come from that claim's refs. Never use numbers from uncited cards.
- If a card has condition_changes, say the condition changed during the run; never describe it as constant.
- UNTESTED: only restate supplied GAPS by listing their ids in gap_ids. Never invent other gaps or explain them.
- Never describe what a flame will, would or is expected to do. Report only what was observed.`;

/**
 * §7.6 worked example: GMT96-T7 from NTRS 20150008962 (the seed paper). The excerpt is verbatim
 * PDF text (pp.2–3 + the p.9 appendix row, PDF artifacts like "KanthalTM, 1" left in, as curators
 * paste them). tests/extract.test.ts checks that this draft survives sanitizeDraft() untouched.
 * It teaches the three hard rules: no unit conversion (1 atm → null + quote), no provenance that
 * is not visible in the excerpt (no page numbers here), and null for plotted-only values.
 */
export const EXTRACT_EXAMPLE = {
  excerpt: `The sample used is a composite cotton-fiberglass fabric blend (75% cotton, 25% fiberglass). The thickness of the sample is about 0.32 mm with an area density 18.2 mg/cm2.
The tests were conducted in ambient oxygen molar fraction of 16% to 21%. Ambient pressure was 1 atm.
A KanthalTM, 1 hot wire was used to ignite the fuel sample leading edge so that the flame can spread in a concurrent configuration.
Figure 2 shows flame development stages of a 2.2 cm sample in 10 cm/s flow, 21% O2. [...] At about 19s, the flame reached a limiting constant length and a steady spread rate relative to the laboratory [11]. This steady spread state lasted for around 9s. [...] Then the flame tip (or more precisely the flame preheating front) moved close to the end of the fuel sample, and the flame decayed in size until complete burnout.
Appendix: Test summary of flat SIBAL fabrics in concurrent flow in BASS and BASS II
Test No.  Sample width (cm)  Flow (cm/s)  O2 % by Vol.  Comments
GMT96-T7  2.2  10  21  BASS`,
  draft: {
    campaign: 'BASS',
    test_id: 'GMT96-T7',
    fuel_material: 'cotton_fiberglass',
    material_class: 'fabric',
    fuel_form: 'fabric',
    thickness_mm: 0.32,
    o2_pct: 21,
    flow_cm_s: 10,
    pressure_kpa: null,
    ignition_method: 'Kanthal hot wire at the fuel sample leading edge (concurrent configuration)',
    outcome: 'sustained',
    spread_rate_mm_s: null,
    key_observation_quote:
      'At about 19s, the flame reached a limiting constant length and a steady spread rate relative to the laboratory [11]. This steady spread state lasted for around 9s.',
    observation_summary:
      'A 2.2 cm wide cotton-fiberglass fabric sample in 10 cm/s concurrent flow at 21% O2 reached steady spread after about 19 s and then decayed until complete burnout.',
    source_title: null,
    source_page: null,
    source_figure: 'Figure 2',
    source_table: 'Appendix: Test summary of flat SIBAL fabrics in concurrent flow in BASS and BASS II',
    source_section: null,
    ntrs_id: null,
    doi: null,
    field_quotes: {
      thickness_mm: 'The thickness of the sample is about 0.32 mm',
      o2_pct: 'a 2.2 cm sample in 10 cm/s flow, 21% O2',
      flow_cm_s: 'a 2.2 cm sample in 10 cm/s flow, 21% O2',
      pressure_kpa: 'Ambient pressure was 1 atm.',
      outcome: 'the flame decayed in size until complete burnout',
    },
  },
} as const;

export const EXTRACT_SYSTEM = `You draft a structured experiment record as JSON from a pasted excerpt of a NASA paper.
Return ONLY a JSON object with these keys (null when not explicitly stated):
campaign, test_id, fuel_material, material_class (thermoplastic|fabric|aramid_fabric|insulation|other),
fuel_form (flat_sheet|rod|fabric|thick_slab), thickness_mm, o2_pct, flow_cm_s, pressure_kpa, ignition_method,
outcome (sustained|extinguished|transition|partial), spread_rate_mm_s, key_observation_quote, observation_summary,
source_title, source_page, source_figure, source_table, source_section, ntrs_id, doi,
field_quotes (object: field name -> verbatim quote with ORIGINAL units backing that value).
Rules:
- Only values explicitly stated in the excerpt. Null otherwise. Never guess.
- Every numeric value needs a field_quotes entry copied verbatim from the excerpt, or it will be discarded.
- No unit conversion. Fill a numeric field only when the excerpt states it in that field's unit
  (% O2, cm/s, mm, kPa, mm/s). Otherwise leave it null and still add the field_quotes entry, so the curator converts it.
- Values shown only in a plot are null.
- key_observation_quote must be copied verbatim from the excerpt.
- Copy test identifiers as written. fuel_material uses a catalog name (PMMA, cotton_fiberglass, nomex) only when the
  excerpt clearly names that material; otherwise copy the excerpt's name.
- If a condition changed during a test (e.g. flow reduced after ignition), say so in observation_summary.
- Provenance (page, figure, table, section, ntrs_id, doi) only when visibly present in the excerpt.
- This is a DRAFT for a human curator. It is never published directly.

WORKED EXAMPLE (a BASS test). Excerpt:
"""
${EXTRACT_EXAMPLE.excerpt}
"""
Correct JSON:
${JSON.stringify(EXTRACT_EXAMPLE.draft)}
Note: pressure_kpa is null because the excerpt gives atm; source_page is null because no page number is visible;
spread_rate_mm_s is null because no number is stated.`;
