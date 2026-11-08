/**
 * §5a Material alias resolver — deterministic, runs before the gates. OWNER: Coder A.
 *
 * Two dictionaries, never merged:
 *  • MATERIAL_ALIASES — safe phrase → catalog material mappings.
 *  • SCENARIO_PRESETS — mission-scenario phrases resolve to a material ONLY through an
 *    explicit preset. A bare "cabin wall" typed by the user never becomes PMMA.
 *
 * The resolver never guesses: unknown or ambiguous phrases come back unresolved with
 * picker candidates, and the user chooses. The LLM only passes the raw phrase through.
 */
import { COPY } from '../lib/copy.js';
import type { Experiment, FuelForm, MaterialClass, ResolvedMaterial, ResolvedScenario } from '../lib/types.js';

type Mapping = { fuel_material: string; material_class: MaterialClass };
type CatalogMaterial = Pick<Experiment, 'domain' | 'fuel_material' | 'material_class'>;

/** Phrase (normalized) → catalog material. Add a row only when the mapping is unambiguous. */
export const MATERIAL_ALIASES: Record<string, Mapping> = {
  pmma: { fuel_material: 'PMMA', material_class: 'thermoplastic' },
  acrylic: { fuel_material: 'PMMA', material_class: 'thermoplastic' },
  plexiglas: { fuel_material: 'PMMA', material_class: 'thermoplastic' },
  plexiglass: { fuel_material: 'PMMA', material_class: 'thermoplastic' },
  'polymethyl methacrylate': { fuel_material: 'PMMA', material_class: 'thermoplastic' },
  nomex: { fuel_material: 'nomex', material_class: 'aramid_fabric' },
  'flight suit': { fuel_material: 'nomex', material_class: 'aramid_fabric' },
  'cotton fiberglass': { fuel_material: 'cotton_fiberglass', material_class: 'fabric' },
  sibal: { fuel_material: 'cotton_fiberglass', material_class: 'fabric' },
  'astronaut clothing': { fuel_material: 'cotton_fiberglass', material_class: 'fabric' },
  'crew clothing': { fuel_material: 'cotton_fiberglass', material_class: 'fabric' },
  'cotton blend': { fuel_material: 'cotton_fiberglass', material_class: 'fabric' },
};

/**
 * Phrases that name a material CLASS but not a material. They narrow the picker; they never resolve.
 * ponytail: "cable jacket" → a specific insulation material once R1 cards one and names it here.
 */
export const CLASS_HINTS: Record<string, MaterialClass> = {
  'cable jacket': 'insulation',
  'cable insulation': 'insulation',
  'wiring insulation': 'insulation',
  'wire insulation': 'insulation',
};

export const MATERIAL_LABELS: Record<string, string> = {
  PMMA: 'PMMA',
  nomex: 'Nomex',
  cotton_fiberglass: 'Cotton-fiberglass fabric',
};
export const CLASS_LABELS: Record<MaterialClass, string> = {
  thermoplastic: 'thermoplastic',
  fabric: 'fabric',
  aramid_fabric: 'aramid fabric',
  insulation: 'insulation',
  other: 'other',
};
export const materialLabel = (m: string) => MATERIAL_LABELS[m] ?? m.replace(/_/g, ' ');

export interface ScenarioPreset {
  id: string;
  label: string;
  /** Explicit mapping, or null when the catalog has no material for it yet (→ picker). */
  material: Mapping | null;
  /** When material is null: narrows the picker to this class. */
  material_class: MaterialClass | null;
  fuel_form: FuelForm | null;
  /** Scenario inputs, not evidence: nominal ISS cabin atmosphere. Airflow is the user's to set. */
  o2_pct: number | null;
  flow_cm_s: number | null;
  thickness_mm: number | null;
  pressure_kpa: number | null;
}

const CABIN_AIR = { o2_pct: 21, flow_cm_s: null, thickness_mm: null, pressure_kpa: 101.325 } as const;

/** §8.1 Scenario Builder templates. The ONLY route by which a mission phrase becomes a material. */
export const SCENARIO_PRESETS: readonly ScenarioPreset[] = [
  {
    id: 'cabin-wall-panel',
    label: 'Cabin wall panel (PMMA)',
    material: { fuel_material: 'PMMA', material_class: 'thermoplastic' },
    material_class: null,
    fuel_form: 'flat_sheet',
    ...CABIN_AIR,
  },
  {
    id: 'cable-insulation',
    label: 'Cable insulation',
    material: null,
    material_class: 'insulation',
    fuel_form: null,
    ...CABIN_AIR,
  },
  {
    id: 'crew-clothing',
    label: 'Crew clothing (cotton blend)',
    material: { fuel_material: 'cotton_fiberglass', material_class: 'fabric' },
    material_class: null,
    fuel_form: 'fabric',
    ...CABIN_AIR,
  },
  // ponytail: no catalog packaging material yet; R1 names one, then this gets an explicit mapping.
  { id: 'cargo-packaging', label: 'Cargo packaging', material: null, material_class: null, fuel_form: null, ...CABIN_AIR },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[-_/,.()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const containsPhrase = (text: string, phrase: string) => ` ${text} `.includes(` ${phrase} `);

/** Distinct solid-domain catalog materials, sorted — what the picker may offer. */
function catalogMaterials(catalog: CatalogMaterial[], cls?: MaterialClass | null): string[] {
  const set = new Set(
    catalog.filter((c) => c.domain === 'solid_flammability' && (!cls || c.material_class === cls)).map((c) => c.fuel_material),
  );
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Raw phrase → catalog material. Every alias (or catalog material name) found in the phrase
 * must agree, otherwise it is ambiguous. No fuzzy matching.
 */
export function resolveMaterial(raw: string | null, catalog: CatalogMaterial[]): ResolvedMaterial {
  const text = raw ? norm(raw) : '';
  if (!text) return { status: 'unresolved', raw, reason: 'missing', candidates: catalogMaterials(catalog) };

  const dictionary: Record<string, Mapping> = { ...MATERIAL_ALIASES };
  for (const c of catalog)
    if (c.domain === 'solid_flammability')
      dictionary[norm(c.fuel_material)] ??= { fuel_material: c.fuel_material, material_class: c.material_class };

  const hits = new Map<string, Mapping>();
  for (const [phrase, m] of Object.entries(dictionary)) if (containsPhrase(text, phrase)) hits.set(m.fuel_material, m);

  if (hits.size === 1) {
    const m = [...hits.values()][0]!;
    return { status: 'resolved', raw, ...m, via: 'alias' };
  }
  if (hits.size > 1) return { status: 'unresolved', raw, reason: 'ambiguous', candidates: [...hits.keys()].sort() };

  const cls = Object.entries(CLASS_HINTS).find(([phrase]) => containsPhrase(text, phrase))?.[1];
  if (cls) return { status: 'unresolved', raw, reason: 'ambiguous', candidates: catalogMaterials(catalog, cls) };
  return { status: 'unresolved', raw, reason: 'unknown', candidates: catalogMaterials(catalog) };
}

/** The user chose a material in the picker. Only catalog materials are offered, so the class comes from the catalog. */
export function pickMaterial(raw: string | null, fuel_material: string, catalog: CatalogMaterial[]): ResolvedMaterial {
  const row = catalog.find((c) => c.domain === 'solid_flammability' && c.fuel_material === fuel_material);
  if (!row) return { status: 'unresolved', raw, reason: 'unknown', candidates: catalogMaterials(catalog) };
  return { status: 'resolved', raw, fuel_material, material_class: row.material_class, via: 'picker' };
}

/** A preset → a scenario. Presets without a material mapping come back unresolved for the picker. */
export function presetScenario(preset: ScenarioPreset, catalog: CatalogMaterial[]): ResolvedScenario {
  const material: ResolvedMaterial = preset.material
    ? { status: 'resolved', raw: preset.label, ...preset.material, via: 'preset' }
    : {
        status: 'unresolved',
        raw: preset.label,
        reason: 'missing',
        candidates: catalogMaterials(catalog, preset.material_class),
      };
  const { o2_pct, flow_cm_s, thickness_mm, pressure_kpa, fuel_form } = preset;
  return { domain: 'solid_flammability', material, fuel_form, o2_pct, flow_cm_s, thickness_mm, pressure_kpa };
}

/** The visible §5a line: `Resolved: "flight suit" → Nomex / aramid fabric`. */
export function resolutionLine(m: ResolvedMaterial): string {
  if (m.status === 'unresolved') return COPY.materialUnresolved;
  const target = `${materialLabel(m.fuel_material)} / ${CLASS_LABELS[m.material_class]}`;
  return m.raw ? `Resolved: "${m.raw}" → ${target}` : `Resolved: ${target}`;
}
