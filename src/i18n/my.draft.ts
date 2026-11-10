/**
 * ⚠ UNREVIEWED BURMESE (MY) DRAFT — DO NOT SHIP.
 *
 * Nothing in src/ may import this file: tests/my-draft-guard.test.ts fails CI if anything does, and `Locale` in
 * ./index.ts stays 'en'. Standing rule (Team Plan R3): Burmese ships complete and reviewed by R3 (native + scientific
 * review, docs/MY-REVIEW.md), or the app stays EN-only. Promotion = R3 signs every key, then Coder A moves the
 * reviewed set into ./index.ts as a real locale.
 *
 * Source: strings from a teammate's practice build (Pyroverse), used with her permission (DECISIONS-ROUND5 #2).
 * Strings only: none of that build's code or data values are used anywhere in IGNIS.
 */
import type { MaterialClass } from '../lib/types';
import type { TranslationKey } from './index';

export const MY_DRAFT_STATUS = 'UNREVIEWED' as const;

/** Our keys → her translation, only where her build has a direct equivalent. Every other key is a blank for R3. */
export const MY_DRAFT: Partial<Record<TranslationKey, string>> = {
  material: 'ပစ္စည်း', // her "Material" (chart metric)
  airflowAxis: 'လေစီးနှုန်း (cm/s)', // adapted: her "Airflow" + our unit
  environments: 'လေထုပုံစံများ', // adapted: her "atmospheric presets" (module description)
};

/** Terms from her strings, for R3 to reuse when translating the remaining keys. `note` flags something to check. */
export const MY_GLOSSARY: readonly { en: string; my: string; note?: string }[] = [
  { en: 'Oxygen', my: 'အောက်ဆီဂျင်' },
  { en: 'Airflow', my: 'လေစီးနှုန်း' },
  { en: 'Material', my: 'ပစ္စည်း' },
  { en: 'Fabric', my: 'အထည်' },
  { en: 'Solid (material)', my: 'အစိုင်အခဲ' },
  { en: 'Flame', my: 'မီးလျှံ' },
  { en: 'Smoke', my: 'မီးခိုး' },
  { en: 'Fuel droplet', my: 'လောင်စာအစက်' },
  { en: 'Extinguishment', my: 'ငြှိမ်းသတ်' },
  { en: 'Detection', my: 'ထောက်လှမ်းရေး' },
  { en: 'Prevention', my: 'ကြိုတင်ကာကွယ်ရေး' },
  { en: 'Suppression', my: 'မီးငြှိမ်းသတ်ရေး' },
  { en: 'Spacecraft', my: 'အာကာသယာဉ်' },
  { en: 'Microgravity environment', my: 'ဆွဲငင်အားမဲ့ပတ်ဝန်းကျင်' },
  { en: 'Spacesuit', my: 'အာကာသဝတ်စုံ' },
  { en: 'Moon', my: 'လကမ္ဘာ' },
  { en: 'Investigation / experiment', my: 'စမ်းသပ်မှု' },
  { en: 'Search', my: 'ရှာဖွေရေး' },
  { en: 'Back', my: 'ရှေ့သို့', note: 'Her "Back" button. Reads as "forward"; looks swapped with Next. Check.' },
  { en: 'Next', my: 'နောက်သို့', note: 'Her "Next" button. Reads as "behind"; looks swapped with Back. Check.' },
  { en: 'Done / close', my: 'ပိတ်မည်' },
];

/**
 * Burmese material phrases from her build, staged for the alias resolver. NOT live: they are MY strings, so they
 * follow the same R3 gate. After review, Coder A adds the approved ones to MATERIAL_ALIASES / CLASS_HINTS in
 * src/engine/aliases.ts, and only for materials that exist in our catalog.
 */
export const MY_ALIAS_CANDIDATES: readonly {
  phrase: string;
  en: string;
  proposed: { fuel_material: string; material_class: MaterialClass } | { class_hint: MaterialClass };
}[] = [
  { phrase: 'နိုမက်စ်', en: 'Nomex (transliteration)', proposed: { fuel_material: 'nomex', material_class: 'aramid_fabric' } },
  {
    phrase: 'ချည်နှင့် ဖန်မျှင်ရောစပ် အထည်',
    en: 'cotton and fiberglass blended fabric',
    proposed: { fuel_material: 'cotton_fiberglass', material_class: 'fabric' },
  },
  { phrase: 'အထည်', en: 'fabric (a class, not a material)', proposed: { class_hint: 'fabric' } },
];
