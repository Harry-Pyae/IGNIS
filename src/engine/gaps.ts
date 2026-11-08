/**
 * §6 Gap detection — the o2 × flow gap grid and Evidence Gap Radar data. OWNER: Coder A.
 * Deterministic, no LLM. Three distinct cell states (Principle 5):
 *   tested        ≥1 verified card falls in the cell
 *   untested      inside the catalog envelope, no card in the cell (hatched on the map)
 *   outside_range entirely beyond the catalog's o2/flow min–max envelope (§5d treatment)
 * Copy: COPY.gapNote — gaps are unstudied, not unsafe.
 */
import { eligibleCards } from '../lib/gates.js';
import type { Experiment, MaterialClass, ResolvedScenario } from '../lib/types.js';

export const GRID = { o2: { min: 14, max: 30, step: 1 }, flow: { min: 0, max: 30, step: 2 } } as const;

export type CellState = 'tested' | 'untested' | 'outside_range';
export interface GapCell {
  o2_min: number;
  o2_max: number;
  flow_min: number;
  flow_max: number;
  state: CellState;
  /** Verified cards inside the cell. */
  count: number;
}
export interface GapGrid {
  /** cells[row][col]: row = o2 band (low → high), col = flow band (low → high). */
  cells: GapCell[][];
  /** o2/flow envelope of the population (cards reporting both), or null when there is none. */
  envelope: { o2_min: number; o2_max: number; flow_min: number; flow_max: number } | null;
  /** Cards in the population — after the gates when a scenario is active. */
  population: number;
}

type GridCard = Pick<Experiment, 'domain' | 'verified_by' | 'o2_pct' | 'flow_cm_s'>;

const bands = (a: { min: number; max: number; step: number }) =>
  Array.from({ length: Math.round((a.max - a.min) / a.step) }, (_, i) => a.min + i * a.step);
const bandIndex = (v: number, a: { min: number; max: number; step: number }) => {
  if (v < a.min || v > a.max) return -1;
  return Math.min(Math.floor((v - a.min) / a.step), bands(a).length - 1);
};

/**
 * @param scenario active scenario → population = cards passing its gates; null → every verified
 *                 solid-flammability card (SAME never enters either way).
 */
export function gapGrid(catalog: Experiment[], scenario: ResolvedScenario | null): GapGrid {
  const verifiedSolid = catalog.filter((c) => c.verified_by != null && c.domain === 'solid_flammability');
  const population: GridCard[] = scenario ? eligibleCards(scenario, verifiedSolid) : verifiedSolid;
  const points = population.filter(
    (c): c is GridCard & { o2_pct: number; flow_cm_s: number } => c.o2_pct != null && c.flow_cm_s != null,
  );
  const envelope = points.length
    ? {
        o2_min: Math.min(...points.map((p) => p.o2_pct)),
        o2_max: Math.max(...points.map((p) => p.o2_pct)),
        flow_min: Math.min(...points.map((p) => p.flow_cm_s)),
        flow_max: Math.max(...points.map((p) => p.flow_cm_s)),
      }
    : null;

  const o2Bands = bands(GRID.o2);
  const flowBands = bands(GRID.flow);
  const counts = o2Bands.map(() => flowBands.map(() => 0));
  for (const p of points) {
    const r = bandIndex(p.o2_pct, GRID.o2);
    const c = bandIndex(p.flow_cm_s, GRID.flow);
    if (r >= 0 && c >= 0) counts[r]![c]!++;
  }

  const cells = o2Bands.map((o2_min, r) =>
    flowBands.map((flow_min, c): GapCell => {
      const o2_max = o2_min + GRID.o2.step;
      const flow_max = flow_min + GRID.flow.step;
      const count = counts[r]![c]!;
      const outside =
        !!envelope &&
        (o2_max <= envelope.o2_min || o2_min > envelope.o2_max || flow_max <= envelope.flow_min || flow_min > envelope.flow_max);
      const state: CellState = count > 0 ? 'tested' : outside ? 'outside_range' : 'untested';
      return { o2_min, o2_max, flow_min, flow_max, state, count };
    }),
  );
  return { cells, envelope, population: population.length };
}

export interface GapRegion {
  cells: number;
  o2_min: number;
  o2_max: number;
  flow_min: number;
  flow_max: number;
}
export interface ThinMaterial {
  fuel_material: string;
  material_class: MaterialClass;
  count: number;
}
export interface GapRadar {
  /** Top 5 largest contiguous (4-connected) untested regions. Outside-range cells are not gaps. */
  regions: GapRegion[];
  /** Solid-flammability materials with fewer than 3 verified cards. */
  thin_materials: ThinMaterial[];
}

export function gapRadar(grid: GapGrid, catalog: Experiment[], limit = 5): GapRadar {
  const rows = grid.cells.length;
  const cols = grid.cells[0]?.length ?? 0;
  const seen = grid.cells.map((row) => row.map(() => false));
  const regions: GapRegion[] = [];
  for (let r0 = 0; r0 < rows; r0++)
    for (let c0 = 0; c0 < cols; c0++) {
      if (seen[r0]![c0] || grid.cells[r0]![c0]!.state !== 'untested') continue;
      const stack: [number, number][] = [[r0, c0]];
      seen[r0]![c0] = true;
      const region: GapRegion = { cells: 0, o2_min: Infinity, o2_max: -Infinity, flow_min: Infinity, flow_max: -Infinity };
      while (stack.length) {
        const [r, c] = stack.pop()!;
        const cell = grid.cells[r]![c]!;
        region.cells++;
        region.o2_min = Math.min(region.o2_min, cell.o2_min);
        region.o2_max = Math.max(region.o2_max, cell.o2_max);
        region.flow_min = Math.min(region.flow_min, cell.flow_min);
        region.flow_max = Math.max(region.flow_max, cell.flow_max);
        for (const [nr, nc] of [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ] as const)
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !seen[nr]![nc] && grid.cells[nr]![nc]!.state === 'untested') {
            seen[nr]![nc] = true;
            stack.push([nr, nc]);
          }
      }
      regions.push(region);
    }
  regions.sort((a, b) => b.cells - a.cells || a.o2_min - b.o2_min || a.flow_min - b.flow_min);

  const byMaterial = new Map<string, ThinMaterial>();
  for (const c of catalog)
    if (c.verified_by != null && c.domain === 'solid_flammability') {
      const m = byMaterial.get(c.fuel_material) ?? { fuel_material: c.fuel_material, material_class: c.material_class, count: 0 };
      m.count++;
      byMaterial.set(c.fuel_material, m);
    }
  const thin_materials = [...byMaterial.values()]
    .filter((m) => m.count < 3)
    .sort((a, b) => a.count - b.count || a.fuel_material.localeCompare(b.fuel_material));

  return { regions: regions.slice(0, limit), thin_materials };
}
