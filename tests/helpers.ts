import type { Experiment, ResolvedScenario } from '../src/lib/types';

/** A verified card shaped like the seed rows (NTRS 20150008962). */
export function card(over: Partial<Experiment> = {}): Experiment {
  return {
    id: crypto.randomUUID(),
    created_at: '2026-11-07T00:00:00Z',
    updated_at: '2026-11-07T00:00:00Z',
    verified_at: '2026-11-07T00:00:00Z',
    domain: 'solid_flammability',
    campaign: 'BASS',
    test_id: 'BASS GMT96-T7',
    fuel_material: 'cotton_fiberglass',
    material_class: 'fabric',
    fuel_form: 'fabric',
    thickness_mm: 0.32,
    o2_pct: 21,
    flow_cm_s: 10,
    pressure_kpa: 101.325,
    ignition_method: 'Kanthal hot wire',
    outcome: 'sustained',
    spread_rate_mm_s: null,
    key_observation_quote: 'At about 19s, the flame reached a limiting constant length',
    observation_summary: null,
    source_title: 'Concurrent flame growth, spread and extinction over composite fabric samples',
    source_url: 'https://ntrs.nasa.gov/citations/20150008962',
    psi_investigation: 'BASS',
    source_page: 3,
    source_figure: 'Figure 2',
    source_table: null,
    source_section: null,
    ntrs_id: '20150008962',
    doi: null,
    media_url: null,
    telemetry: null,
    condition_changes: null,
    verified_by: 'Ada Reviewer',
    notes: null,
    ...over,
  };
}

/** GMT45-T4: ignited at 10 cm/s, flow reduced to 2.2 and held → extinguished. */
export const t4 = (over: Partial<Experiment> = {}) =>
  card({
    campaign: 'BASS-II',
    test_id: 'BASS-II GMT45-T4',
    o2_pct: 18.7,
    flow_cm_s: 2.2,
    outcome: 'extinguished',
    condition_changes: [
      { parameter: 'flow_cm_s', from: 10, to: 2.2, stored: 'final_held', note: 'reduced after ignition, then held (p.5)' },
    ],
    ...over,
  });

export function scenario(over: Partial<ResolvedScenario> = {}): ResolvedScenario {
  return {
    domain: 'solid_flammability',
    material: { status: 'resolved', raw: 'crew clothing', fuel_material: 'cotton_fiberglass', material_class: 'fabric', via: 'alias' },
    fuel_form: 'fabric',
    thickness_mm: null,
    o2_pct: 21,
    flow_cm_s: 10,
    pressure_kpa: null,
    ...over,
  };
}
