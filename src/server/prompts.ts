/**
 * System prompts — IDENTICAL for every provider (§3). Part 2 owns refining the wording;
 * the output contracts (Zod schemas in src/lib/types.ts) are final.
 * Each prompt mentions JSON explicitly (required by Groq's json_object mode).
 * Bump PROMPT_VERSION on any change: it is part of the briefing-cache key.
 */
export const PROMPT_VERSION = 'prompts-v2';

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
- key_observation_quote must be copied verbatim from the excerpt.
- If a condition changed during a test (e.g. flow reduced after ignition), say so in observation_summary.
- Provenance (page, figure, table, section, ntrs_id, doi) only when visibly present in the excerpt.
- This is a DRAFT for a human curator. It is never published directly.`;
