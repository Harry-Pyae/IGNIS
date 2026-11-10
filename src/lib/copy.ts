/**
 * Approved scientific copy (docs/DECISIONS-ROUND2.md, decisions 3–4). OWNER: Coder A.
 * Coder B and R3 render these strings (or reviewed translations of them) — never paraphrase
 * them into stronger claims. A finite curated catalog cannot establish absence across all
 * NASA research, so absence is always bounded to "the current IGNIS catalog".
 */
export const COPY = {
  sliderCaption: 'Sliders change which verified NASA experiments IGNIS retrieves.',
  // Environment presets (DECISIONS-ROUND5 #1): framed as showing where evidence ends, never as a fault.
  environmentCaption: "Environment presets change oxygen and pressure only. Use them to see where the verified catalog's evidence ends.",
  elevatedO2: (pct: number) => `Elevated oxygen: ${pct}% O₂ is above the 21% of Earth-normal air.`,
  absence: 'No matching verified evidence in the current IGNIS catalog.',
  gapNote:
    'Gaps are not necessarily unsafe — they have no matching verified evidence in the current IGNIS catalog. IGNIS lists them as candidate areas for further study.',
  claimsGuarantee:
    'Observed and supported statements cite retrieved experiments, and the server checks each cited value against its card. Gaps are marked separately.',
  fallback: 'Briefing unavailable — showing matched evidence only.',
  materialUnresolved: 'Material unresolved — select a catalog material',
  outsideRange:
    "Your value is outside the range NASA's verified solid-flammability catalog currently covers — IGNIS cannot cite evidence here.",
  // Match summary (decision 10): the count, then why every uncounted parameter is uncounted.
  compared: (n: number, m: number) => `Compared on ${n} of ${m} parameters`,
  weakEvidence: (m: number) => `Weak evidence — compared on 0 of ${m} parameters`,
  unscored: {
    not_specified: (n: number) => `${n} not specified`,
    identical: (n: number) => `${n} identical across all candidates`,
    not_reported: (n: number) => `${n} not reported by this experiment`,
    none_reported: (n: number) => `${n} not reported by any candidate`,
  },
  illustration: 'Illustration — not NASA experiment imagery.',
  withheld: (n: number) => `${n} statement${n === 1 ? '' : 's'} withheld (failed evidence validation)`,
  inReview: (n: number) => `Catalog in verification — ${n} card${n === 1 ? '' : 's'} in review`,
} as const;
