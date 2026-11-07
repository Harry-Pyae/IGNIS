import { describe, expect, it } from 'vitest';
import { computeCoverage } from '../src/lib/coverage';
import { gateExperiment } from '../src/lib/gates';
import { verifierNameProblem } from '../src/lib/verifier';
import { card, scenario, t4 } from './helpers';

describe('gates (§5b stage 1)', () => {
  it('SAME (smoke_detection) never passes a solid scenario', () => {
    const g = gateExperiment(scenario(), card({ domain: 'smoke_detection', campaign: 'SAME' }));
    expect(g).toMatchObject({ eligible: false, reasons: ['domain_mismatch'] });
  });
  it('exact material vs same class vs mismatch', () => {
    expect(gateExperiment(scenario(), card()).fuel_match).toBe('exact');
    expect(gateExperiment(scenario(), card({ fuel_material: 'nomex_blend' })).fuel_match).toBe('class');
    expect(gateExperiment(scenario(), card({ fuel_material: 'PMMA', material_class: 'thermoplastic' })).reasons).toEqual([
      'material_mismatch',
    ]);
  });
  it('sheet ~ slab allowed, fabric ≠ rod', () => {
    const pmma = scenario({
      material: { status: 'resolved', raw: null, fuel_material: 'PMMA', material_class: 'thermoplastic', via: 'preset' },
      fuel_form: 'flat_sheet',
    });
    expect(gateExperiment(pmma, card({ fuel_material: 'PMMA', material_class: 'thermoplastic', fuel_form: 'thick_slab' })).eligible).toBe(true);
    expect(gateExperiment(scenario(), card({ fuel_form: 'rod' })).reasons).toEqual(['form_incompatible']);
  });
  it('unresolved material is never guessed', () => {
    const s = scenario({ material: { status: 'unresolved', raw: 'cabin wall', reason: 'ambiguous', candidates: ['PMMA'] } });
    expect(gateExperiment(s, card()).reasons).toEqual(['material_unresolved']);
  });
  it('lists every failing gate', () =>
    expect(gateExperiment(scenario(), card({ domain: 'smoke_detection', fuel_form: 'rod' })).reasons).toEqual([
      'domain_mismatch',
      'form_incompatible',
    ]));
});

describe('coverage (A4)', () => {
  const seeds = [card(), card({ test_id: 'BASS GMT96-T8', flow_cm_s: 5 }), t4()];

  it('zero range (all seeds share thickness + pressure): equal = covered, different = outside range', () => {
    const c = computeCoverage(scenario({ thickness_mm: 0.32, pressure_kpa: 200 }), seeds, seeds, 'r');
    const by = Object.fromEntries(c.params.map((p) => [p.parameter, p]));
    expect(by.thickness_mm).toMatchObject({ state: 'covered', catalog_min: 0.32, catalog_max: 0.32 });
    expect(by.pressure_kpa).toMatchObject({ state: 'outside_catalog_range', catalog_min: 101.325, catalog_max: 101.325 });
    expect(c.gaps).toEqual([
      {
        id: 'G1',
        scope: 'catalog',
        kind: 'outside_catalog_range',
        parameter: 'pressure_kpa',
        message: 'Pressure 200 kPa is outside the range the current IGNIS catalog covers (only 101.325 kPa). IGNIS cannot cite evidence here.',
      },
    ]);
  });

  it('distinguishes catalog-wide gaps from values missing in the top-k', () => {
    const noThickness = [card({ thickness_mm: null })];
    const c = computeCoverage(scenario({ thickness_mm: 1 }), noThickness, noThickness, 'r');
    expect(c.gaps[0]).toMatchObject({ scope: 'catalog', kind: 'untested_in_catalog', parameter: 'thickness_mm' });
    expect(c.gaps[0]!.message).toBe('Thickness: no matching verified evidence in the current IGNIS catalog.');

    const r = computeCoverage(scenario({ thickness_mm: 0.32 }), seeds, [card({ thickness_mm: null })], 'r');
    expect(r.gaps[0]).toMatchObject({ scope: 'retrieved', kind: 'not_reported_in_matches', parameter: 'thickness_mm' });
  });

  it('unspecified scenario values are not gaps', () => {
    const c = computeCoverage(scenario(), seeds, seeds, 'r');
    expect(c.params.find((p) => p.parameter === 'pressure_kpa')!.state).toBe('not_specified');
    expect(c.gaps).toEqual([]);
  });

  it('no eligible evidence → one catalog-wide gap with the approved copy', () => {
    const c = computeCoverage(scenario(), [], [], 'r');
    expect(c.gaps).toEqual([
      {
        id: 'G1',
        scope: 'catalog',
        kind: 'no_eligible_evidence',
        parameter: null,
        message: 'No matching verified evidence in the current IGNIS catalog.',
      },
    ]);
  });
});

describe('verifier names (A2)', () => {
  it.each(['', ' ', 'x', 'Part 1 lead (placeholder)', 'TBD', 'test', 'Unknown', 'Part 4'])('rejects %j', (n) =>
    expect(verifierNameProblem(n)).not.toBeNull(),
  );
  it.each(['Ada Lovelace', 'Pyae Sone Htut', 'Celeste Ng'])('accepts %j', (n) => expect(verifierNameProblem(n)).toBeNull());
});
