import { describe, expect, it } from 'vitest';
import {
  pickMaterial,
  presetScenario,
  resolutionLine,
  resolveMaterial,
  SCENARIO_PRESETS,
} from '../src/engine/aliases';
import { gapGrid, gapRadar } from '../src/engine/gaps';
import { matchScenario, retrieve, whyMatched } from '../src/engine/match';
import { FIXTURES, SEED_CARDS } from '../src/lib/fixtures';
import { type Experiment, MatchResultSchema } from '../src/lib/types';
import { card, scenario, t4 } from './helpers';

const pmma = (over: Partial<Experiment> = {}) =>
  card({ fuel_material: 'PMMA', material_class: 'thermoplastic', fuel_form: 'flat_sheet', test_id: 'PMMA-1', ...over });
const catalog = [...SEED_CARDS, pmma(), card({ fuel_material: 'kapton', material_class: 'insulation', fuel_form: 'rod' })];

describe('alias resolver (§5a)', () => {
  it('material dictionary resolves, with the visible line', () => {
    const m = resolveMaterial('Flight suit', catalog);
    expect(m).toEqual({ status: 'resolved', raw: 'Flight suit', fuel_material: 'nomex', material_class: 'aramid_fabric', via: 'alias' });
    expect(resolutionLine(m)).toBe('Resolved: "Flight suit" → Nomex / aramid fabric');
  });
  it('catalog material names resolve too', () =>
    expect(resolveMaterial('a kapton wire', catalog)).toMatchObject({ status: 'resolved', fuel_material: 'kapton' }));
  it('a bare mission phrase never becomes PMMA', () => {
    const m = resolveMaterial('cabin wall', catalog);
    expect(m).toMatchObject({ status: 'unresolved', reason: 'unknown' });
    expect(resolutionLine(m)).toBe('Material unresolved — select a catalog material');
  });
  it('conflicting materials are ambiguous, never picked', () =>
    expect(resolveMaterial('PMMA panel with cotton blend cover', catalog)).toEqual({
      status: 'unresolved',
      raw: 'PMMA panel with cotton blend cover',
      reason: 'ambiguous',
      candidates: ['PMMA', 'cotton_fiberglass'],
    }));
  it('class hints narrow the picker but do not resolve', () =>
    expect(resolveMaterial('cable jacket', catalog)).toMatchObject({ status: 'unresolved', reason: 'ambiguous', candidates: ['kapton'] }));
  it('missing phrase → missing', () => expect(resolveMaterial('  ', catalog)).toMatchObject({ status: 'unresolved', reason: 'missing' }));
  it('picker takes the class from the catalog, and refuses non-catalog materials', () => {
    expect(pickMaterial('cabin wall', 'PMMA', catalog)).toMatchObject({ status: 'resolved', material_class: 'thermoplastic', via: 'picker' });
    expect(pickMaterial('x', 'unobtainium', catalog).status).toBe('unresolved');
  });
  it('presets carry explicit mappings; unmapped presets go to the picker', () => {
    const [wall, cable] = SCENARIO_PRESETS;
    expect(presetScenario(wall!, catalog)).toMatchObject({
      material: { status: 'resolved', fuel_material: 'PMMA', material_class: 'thermoplastic', via: 'preset' },
      fuel_form: 'flat_sheet',
    });
    expect(presetScenario(cable!, catalog).material).toMatchObject({ status: 'unresolved', candidates: ['kapton'] });
  });
});

describe('matching engine (§5b–§5d) agrees with the contract fixtures', () => {
  const pick = (s: Parameters<typeof matchScenario>[0], cat: Experiment[], id: string) =>
    matchScenario(s, cat).find((m) => m.experiment.id === id)!;

  it('zeroRange: equal → same, excluded from the score', () => {
    const m = pick(FIXTURES.zeroRange.scenario, SEED_CARDS, SEED_CARDS[0]!.id);
    expect(MatchResultSchema.parse(m).chips).toEqual(FIXTURES.zeroRange.match.chips);
    expect(m).toMatchObject({ scored_params: 2, total_params: 4, score: 1, weak_evidence: false });
  });

  it('outsideRange: ⇥ chip, still scored with d capped at 1, never clamped', () => {
    const m = pick(FIXTURES.outsideRange.scenario, SEED_CARDS, SEED_CARDS[0]!.id);
    expect(m.chips).toEqual(FIXTURES.outsideRange.match.chips);
    expect(m.scored_params).toBe(2);
    expect(m.score).toBeCloseTo(0.3 / 0.65 + 0.1, 9);
  });

  it('missingData: card null → not reported, excluded', () => {
    const cat = SEED_CARDS.map((c) => (c.id === SEED_CARDS[1]!.id ? { ...c, thickness_mm: null } : c));
    const m = pick(FIXTURES.missingData.scenario, cat, SEED_CARDS[1]!.id);
    expect(m.chips).toEqual(FIXTURES.missingData.match.chips);
    expect(m.scored_params).toBe(2);
  });

  it('chip thresholds: same ≤5 %, close ≤20 %, different >20 % of range', () => {
    const cat = [card({ o2_pct: 10 }), card({ o2_pct: 30 })]; // range 20
    const chipAt = (o2: number) => matchScenario(scenario({ o2_pct: o2, flow_cm_s: null }), cat)[0]!.chips.o2_pct;
    expect(chipAt(11)).toBe('same'); // d 0.05 to the nearest card
    expect(chipAt(14)).toBe('close'); // 0.2
    expect(chipAt(15)).toBe('different'); // 0.25
  });

  it('untested when no eligible card reports the parameter', () => {
    const m = matchScenario(scenario({ pressure_kpa: 50 }), [card({ pressure_kpa: null })])[0]!;
    expect(m.chips.pressure_kpa).toBe('untested');
  });

  it('weak evidence (0 scored params) ranks after every scored match', () => {
    const s = scenario({ o2_pct: 21, flow_cm_s: null });
    const weak = card({ test_id: 'A-weak', o2_pct: null });
    const far = card({ test_id: 'Z-far', o2_pct: 30, fuel_material: 'cotton_blend' });
    const near = card({ test_id: 'M-near', o2_pct: 21 });
    const ranked = matchScenario(s, [weak, far, near]);
    expect(ranked.map((m) => m.experiment.test_id)).toEqual(['M-near', 'Z-far', 'A-weak']);
    expect(whyMatched(ranked[2]!).summary).toBe('weak evidence — material match only');
    expect(whyMatched(ranked[0]!).summary).toBe('Matched 1 of 4 parameters.');
  });

  it('ties: exact fuel before class, then test_id', () => {
    const s = scenario({ o2_pct: null, flow_cm_s: null });
    const ranked = matchScenario(s, [card({ test_id: 'B' }), card({ test_id: 'C', fuel_material: 'other_fabric' }), card({ test_id: 'A' })]);
    expect(ranked.map((m) => m.experiment.test_id)).toEqual(['A', 'B', 'C']);
  });

  it('changing-conditions card is chipped against its stored scalar (qualifier travels on the card)', () => {
    const m = matchScenario(scenario({ flow_cm_s: 2.2 }), [card(), t4()]).find((x) => x.experiment.test_id === 'BASS-II GMT45-T4')!;
    expect(m.chips.flow_cm_s).toBe('same');
    expect(m.experiment.condition_changes?.[0]).toMatchObject({ parameter: 'flow_cm_s', stored: 'final_held' });
  });

  it('WHY THIS MATCHED lines come from chips only', () =>
    expect(whyMatched(pick(FIXTURES.outsideRange.scenario, SEED_CARDS, SEED_CARDS[0]!.id)).lines.map((l) => `${l.symbol} ${l.text}`)).toEqual([
      '✓ Material: exact',
      '⇥ Oxygen: outside catalog range',
      '✓ Airflow: same',
      '– Thickness: not specified',
      '– Pressure: not specified',
    ]));
});

describe('domain purity (Principle 4) — red tests', () => {
  const twin = (over: Partial<Experiment>) => card({ ...over, o2_pct: 21, flow_cm_s: 10 });

  it('SAME and FLEX never reach solid retrieval, even with identical parameters', () => {
    const same = twin({ domain: 'smoke_detection', campaign: 'SAME', test_id: 'SAME-1' });
    const flex = twin({ domain: 'droplet_combustion' as Experiment['domain'], campaign: 'FLEX', test_id: 'FLEX-1' });
    const r = retrieve(scenario(), [same, flex, card()], 'r');
    expect(r.matches.map((m) => m.experiment.campaign)).toEqual(['BASS']);
    expect(r.eligible_count).toBe(1);
    const grid = gapGrid([same, flex], null);
    expect(grid.population).toBe(0);
    expect(gapRadar(grid, [same, flex]).thin_materials).toEqual([]);
  });

  it('unverified cards never match', () => expect(matchScenario(scenario(), [card({ verified_by: null })])).toEqual([]));
});

describe('retrieve', () => {
  it('top-k ≤ 5 with coverage over the same population', () => {
    const many = Array.from({ length: 8 }, (_, i) => card({ test_id: `T${i}`, o2_pct: 15 + i }));
    const r = retrieve(scenario({ o2_pct: 21 }), many, 'rev', 9);
    expect(r.matches).toHaveLength(5);
    expect(r.matches[0]!.experiment.o2_pct).toBe(21);
    expect(r.coverage).toMatchObject({ catalog_revision: 'rev', eligible_catalog_count: 8, retrieved_count: 5 });
  });
  it('no eligible rows → empty matches + the absence gap', () => {
    const r = retrieve(FIXTURES.noEligibleRows.scenario, SEED_CARDS, 'fixture-rev');
    expect(r.matches).toEqual([]);
    expect(r.coverage).toEqual(FIXTURES.noEligibleRows.coverage);
  });
});

describe('gap grid + radar (§6)', () => {
  const grid = gapGrid(SEED_CARDS, null);
  const at = (o2: number, flow: number) => grid.cells[o2 - 14]![flow / 2]!;

  it('14–30 % O₂ × 0–30 cm/s in 1 % × 2 cm/s cells', () => {
    expect(grid.cells).toHaveLength(16);
    expect(grid.cells.every((r) => r.length === 15)).toBe(true);
    expect(grid.envelope).toEqual({ o2_min: 18.7, o2_max: 21, flow_min: 2.2, flow_max: 10 });
  });

  it('tested / untested / outside-range are distinct states', () => {
    expect(at(21, 10)).toMatchObject({ state: 'tested', count: 1 }); // T7
    expect(at(21, 4)).toMatchObject({ state: 'tested', count: 1 }); // T8 at 5 cm/s
    expect(at(18, 2).state).toBe('tested'); // T4 18.7 %, 2.2 cm/s
    expect(at(20, 6).state).toBe('untested');
    expect(at(25, 6).state).toBe('outside_range');
    expect(at(20, 0).state).toBe('outside_range');
  });

  it('active scenario gates the population', () =>
    expect(gapGrid(catalog, FIXTURES.noEligibleRows.scenario).population).toBe(1)); // only the PMMA sheet

  it('radar lists the largest untested region and thin materials', () => {
    const radar = gapRadar(grid, SEED_CARDS);
    const total = grid.cells.flat().filter((c) => c.state === 'untested').length;
    expect(radar.regions.reduce((n, r) => n + r.cells, 0)).toBe(total);
    expect(radar.regions[0]).toMatchObject({ o2_min: 18, o2_max: 22, flow_min: 2, flow_max: 12 });
    expect(radar.thin_materials).toEqual([]); // 3 cotton_fiberglass cards
    expect(gapRadar(grid, catalog).thin_materials.map((m) => m.fuel_material)).toEqual(['kapton', 'PMMA']);
  });
});

describe('gap radar with nothing plottable (round 3, item 6)', () => {
  it('empty catalog: 240 untested cells, null envelope, and NO ranked regions', () => {
    const grid = gapGrid([], null);
    expect(grid.cells.flat()).toHaveLength(240);
    expect(grid.cells.flat().every((c) => c.state === 'untested')).toBe(true);
    expect([grid.envelope, grid.population, grid.plotted]).toEqual([null, 0, 0]);
    const radar = gapRadar(grid, []);
    expect(radar).toEqual({ availability: 'no_plottable_evidence', regions: [], thin_materials: [] });
  });

  it('eligible cards that lack an axis: population counted, nothing plotted, still not ranked', () => {
    const noAxes = [card({ test_id: 'A', o2_pct: null }), card({ test_id: 'B', flow_cm_s: null })];
    const grid = gapGrid(noAxes, null);
    expect([grid.population, grid.plotted, grid.envelope]).toEqual([2, 0, null]);
    const radar = gapRadar(grid, noAxes);
    expect(radar.availability).toBe('no_plottable_evidence');
    expect(radar.regions).toEqual([]);
    expect(radar.thin_materials).toEqual([{ fuel_material: 'cotton_fiberglass', material_class: 'fabric', count: 2 }]);
  });

  it('a real envelope still ranks', () => {
    const grid = gapGrid(SEED_CARDS, null);
    expect(grid.plotted).toBe(3);
    expect(gapRadar(grid, SEED_CARDS).availability).toBe('ranked');
  });
});
