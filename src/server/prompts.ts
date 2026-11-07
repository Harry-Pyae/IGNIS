/**
 * System prompts — IDENTICAL for every provider (§3). Part 2 owns refining these;
 * the output contracts (Zod schemas in src/lib/types.ts) are final.
 * Each prompt mentions JSON explicitly (required by Groq's json_object mode).
 */

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
You may ONLY use the cards provided (ids E1..Ek). Return ONLY:
{"claims":[{"classification":"OBSERVED"|"SUPPORTED"|"UNTESTED","text":string,"evidence_ids":string[]}]}
Rules:
- OBSERVED: something a single card directly reports. Cite it.
- SUPPORTED: a careful interpretation across cards. Cite every card it rests on.
- UNTESTED: a scenario condition no card covers. evidence_ids may be empty. Do not explain why.
- Every OBSERVED and SUPPORTED claim must cite at least one id from the provided cards.
- Never state a number that does not appear in the cards.
- Never say what a flame will or would do. Never use the word "predict". Report only what was observed.`;

export const EXTRACT_SYSTEM = `You draft a structured experiment record as JSON from a pasted excerpt of a NASA paper.
Return ONLY a JSON object using these keys (omit or null when not explicitly stated):
campaign, test_id, fuel_material, material_class (thermoplastic|fabric|aramid_fabric|insulation|other),
fuel_form (flat_sheet|rod|fabric|thick_slab), thickness_mm, o2_pct, flow_cm_s, pressure_kpa, ignition_method,
outcome (sustained|extinguished|transition|partial), spread_rate_mm_s, key_observation_quote, observation_summary,
source_title, source_page, source_figure, source_table, source_section, ntrs_id, doi,
field_quotes (object: field name -> verbatim quote with ORIGINAL units backing that value).
Rules:
- Only values explicitly stated in the excerpt. Null otherwise. Never guess.
- key_observation_quote and every field_quotes entry must be copied verbatim from the excerpt.
- Do not convert units in the quotes; the curator normalizes numbers.
- Provenance (page, figure, table, section, ntrs_id, doi) only when visibly present in the excerpt.
- This is a DRAFT for a human curator. It is never published directly.`;
