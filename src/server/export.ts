/**
 * §8.1 item 6: "Export Open Dataset (.json)" — every verified card with its provenance, plus an
 * embedded schema README. Positioning (approved): a traceable, structured research catalog with
 * NASA source provenance. Not "publication-ready".
 */
import type { Experiment } from '../lib/types.js';

export const EXPORT_FORMAT = 'ignis-catalog-v1';

export const EXPORT_README = {
  title: 'IGNIS verified catalog export',
  description:
    'A traceable, structured research catalog with NASA source provenance: verified NASA microgravity combustion experiments. Every card was checked field by field against its source by the named reviewer in verified_by.',
  scope:
    'domain "solid_flammability" = solid-material flammability (BASS, BASS-II, Saffire, SoFIE/MIST). domain "smoke_detection" = SAME context cards; they are never compared with solid-flammability tests. Liquid-droplet combustion (FLEX) is not part of this catalog.',
  conventions: [
    'null means the source does not state the value (or it was ambiguous). It is never a guess and never zero.',
    'Numeric columns are normalized: o2_pct = % O2 by volume, flow_cm_s = cm/s forced flow, thickness_mm = mm, pressure_kpa = kPa, spread_rate_mm_s = mm/s.',
    'key_observation_quote is verbatim from the source, with its original units.',
    'condition_changes lists conditions that changed during a run ({parameter, from, to, stored, note}); the scalar column holds the value named by "stored". Such a test is not a constant-condition test.',
    'Provenance fields (source_page, source_figure, source_table, source_section, ntrs_id, doi) are recorded only when seen in the source. source_page is where the quote is; a figure can be on another page.',
    'telemetry, when present, is a curve digitized from a source figure, not raw instrument data.',
    'outcome is what the experiment observed: sustained | extinguished | transition | partial.',
  ],
  fields: {
    id: 'IGNIS card id (uuid)',
    domain: 'solid_flammability | smoke_detection',
    campaign: 'e.g. BASS, BASS-II, Saffire-I, SoFIE-MIST, SAME',
    test_id: 'test identifier as given in the source',
    fuel_material: 'normalized material name, e.g. PMMA, cotton_fiberglass, nomex',
    material_class: 'thermoplastic | fabric | aramid_fabric | insulation | other (curator-assigned)',
    fuel_form: 'flat_sheet | rod | fabric | thick_slab',
    thickness_mm: 'number | null',
    o2_pct: 'number | null',
    flow_cm_s: 'number | null',
    pressure_kpa: 'number | null',
    ignition_method: 'text | null',
    outcome: 'sustained | extinguished | transition | partial',
    spread_rate_mm_s: 'number | null',
    key_observation_quote: 'verbatim source quote',
    observation_summary: "curator's plain-language summary | null",
    source_title: 'source document title',
    source_url: 'NTRS or PSI link',
    psi_investigation: 'psi.nasa.gov investigation name | null',
    source_page: 'page of the quote | null',
    source_figure: 'text | null',
    source_table: 'text | null',
    source_section: 'text | null',
    ntrs_id: 'NASA Technical Reports Server id | null',
    doi: 'only when a DOI exists | null',
    media_url: 'NASA public-domain still/footage | null',
    telemetry: '{label, x_label, y_label, points: [[x, y], ...]} | null',
    condition_changes: '[{parameter, from, to, stored, note}] | null',
    verified_by: 'name of the human reviewer who verified the card',
    verified_at: 'timestamp of verification',
    notes: 'curator notes | null',
    created_at: 'timestamp',
    updated_at: 'timestamp',
  },
} as const;

export function buildExport(cards: Experiment[], catalogRevision: string, now = new Date()) {
  const experiments = cards
    .filter((c) => c.verified_by != null)
    .sort((a, b) => a.campaign.localeCompare(b.campaign) || a.test_id.localeCompare(b.test_id) || a.id.localeCompare(b.id));
  return {
    format: EXPORT_FORMAT,
    readme: EXPORT_README,
    catalog_revision: catalogRevision,
    exported_at: now.toISOString(),
    count: experiments.length,
    experiments,
  };
}
