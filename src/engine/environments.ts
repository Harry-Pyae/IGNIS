/**
 * Environment context presets (DECISIONS-ROUND5 #1). OWNER: Coder A. A second preset row, distinct from the material
 * presets in aliases.ts: each sets ONLY o2_pct and pressure_kpa (airflow, material and form stay untouched).
 *
 * These are scenario INPUTS, not evidence. Most verified experiments ran near Earth-normal air, so the elevated-O₂ /
 * low-pressure settings land outside the catalog's range; the console then shows the approved outside-range / gap
 * copy. That is the point of these presets ("see where verified evidence ends"), not a malfunction.
 *
 * Verification gate: a preset renders only after R1 checks its figures and context note against the named NASA source
 * and signs it (verified_by = R1's own name, then Coder A updates this file). Until then `status: 'placeholder'`.
 * The exploration and EVA figures came from a teammate's unsourced practice build and are placeholders by rule.
 * Checklist: docs/FACT-CHECK-QUEUE.md.
 */
import { verifierNameProblem } from '../lib/verifier.js';

/** 1 psi in kPa (exact to the precision stored). */
export const KPA_PER_PSI = 6.894757;

export interface EnvironmentPreset {
  id: 'iss-baseline' | 'exploration-atmosphere' | 'eva-suit';
  label: string;
  o2_pct: number;
  /** Normalized value the engine uses. */
  pressure_kpa: number;
  /** The pressure as the source states it (original units preserved, Core Principle 5). */
  pressure_original: { value: number; unit: 'psi' | 'kPa' };
  /** One-line context note; shown only once verified. */
  context: string;
  verification: {
    status: 'placeholder' | 'verified';
    /** What R1 must confirm before this preset can render. */
    check: string;
    /** The NASA source R1 checks against. */
    source_to_confirm: string;
    /** The exact source page R1 used (null until verified). */
    source_url: string | null;
    /** R1's own full name (null until verified). Publication is a named human. */
    verified_by: string | null;
  };
}

export const ENVIRONMENT_PRESETS: readonly EnvironmentPreset[] = [
  {
    id: 'iss-baseline',
    label: 'ISS baseline',
    o2_pct: 21,
    pressure_kpa: 101.325,
    pressure_original: { value: 101.325, unit: 'kPa' },
    context: 'The ISS cabin is kept at Earth-normal air: about 21% oxygen at sea-level pressure.',
    verification: {
      status: 'placeholder',
      check: '21% O₂ and 101.3 kPa (14.7 psi) as the nominal ISS cabin atmosphere; the context sentence.',
      source_to_confirm: 'NASA ISS environmental control and life support (ECLSS) documentation for the nominal cabin atmosphere.',
      source_url: null,
      verified_by: null,
    },
  },
  {
    id: 'exploration-atmosphere',
    label: 'Exploration / Moon-base atmosphere',
    o2_pct: 30, // PLACEHOLDER (unsourced practice-build figure)
    pressure_kpa: 70.3, // PLACEHOLDER: 10.2 psi
    pressure_original: { value: 10.2, unit: 'psi' },
    context: 'Proposed exploration habitats lower the pressure and raise the oxygen fraction to shorten spacesuit pre-breathe.',
    verification: {
      status: 'placeholder',
      check:
        'Both figures. The practice build used 30% O₂ / 10.2 psi; the NASA Exploration Atmospheres Working Group final report is ' +
        'recalled as recommending about 34% O₂ at 8.2 psia, and 10.2 psi as the Shuttle pre-EVA staging pressure at a different ' +
        'O₂ fraction. Use whichever values the source states, with its exact wording for the context sentence.',
      source_to_confirm:
        'NASA/TP-2010-216134, "Recommendations for Exploration Spacecraft Internal Atmospheres: The Final Report of the NASA ' +
        'Exploration Atmospheres Working Group" (NTRS).',
      source_url: null,
      verified_by: null,
    },
  },
  {
    id: 'eva-suit',
    label: 'Spacesuit EVA',
    o2_pct: 100, // PLACEHOLDER (unsourced practice-build figure)
    pressure_kpa: 29.6, // PLACEHOLDER: 4.3 psi
    pressure_original: { value: 4.3, unit: 'psi' },
    context: 'The spacesuit runs on pure oxygen at low pressure, which keeps the suit flexible.',
    verification: {
      status: 'placeholder',
      check: '100% O₂ and 4.3 psi (29.6 kPa) as the EMU operating pressure; the context sentence (suit flexibility).',
      source_to_confirm: 'NASA Extravehicular Mobility Unit (EMU) documentation for the suit operating pressure and atmosphere.',
      source_url: null,
      verified_by: null,
    },
  },
];

/** Only signed presets reach the UI: verified status, a real reviewer name, and a source URL. */
export const visibleEnvironmentPresets = (presets: readonly EnvironmentPreset[] = ENVIRONMENT_PRESETS) =>
  presets.filter(
    ({ verification: v }) => v.status === 'verified' && !verifierNameProblem(v.verified_by) && !!v.source_url,
  );

/** Applies a preset: oxygen and pressure only. Airflow, material, form and thickness are left untouched. */
export function applyEnvironment<T extends { o2_pct: number | null; pressure_kpa: number | null }>(
  scenario: T,
  preset: Pick<EnvironmentPreset, 'o2_pct' | 'pressure_kpa'>,
): T {
  return { ...scenario, o2_pct: preset.o2_pct, pressure_kpa: preset.pressure_kpa };
}

/** True when the preset's oxygen is above Earth-normal air (21%). Drives the elevated-O₂ note. */
export const isElevatedO2 = (preset: Pick<EnvironmentPreset, 'o2_pct'>) => preset.o2_pct > 21;
