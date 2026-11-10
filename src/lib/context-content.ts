/**
 * Context content (DECISIONS-ROUND5 #3): background about ISS facilities, PSI investigations, Earth spinoffs and
 * the Apollo 1 fire. OWNER: Coder A (data shape); Coder B renders it later; R1 fact-checks and signs each entry.
 *
 * RENDERING RULES (enforced by renderableContext() and tests/context-content.test.ts):
 *  • An entry renders ONLY when verified_by holds the real name of the person who checked it against NASA's own
 *    page, and source_url points at that page. Every entry starts unsigned (null).
 *  • Surfaces: a Context / learn section and the guided-mission captions ONLY. Never on evidence cards, the
 *    Evidence Map or the Mission Brief. This is background, not evidence, and it is never cited as a claim.
 *  • Domain rule unchanged: droplet (FLEX, CFI), gaseous (ACME, SPICE/SLICE) and smoke (SAME, DAFT) topics may
 *    appear here as context, but nothing from those domains ever becomes a catalog card.
 *  • No figures: entries carry no numbers from the unsourced practice build they were adapted from. If R1 wants a
 *    figure, it comes from the cited NASA page.
 *
 * text_my is an UNREVIEWED draft from the same practice build (null where none existed or it carried figures); it
 * follows the Burmese gate in docs/MY-REVIEW.md before it can show.
 */
import { verifierNameProblem } from './verifier.js';

export type ContextKind = 'facility' | 'investigation' | 'spinoff' | 'heritage';
/** What the entry is about. Only `solid_flammability` topics have catalog cards; the rest are context only. */
export type ContextTopic = 'solid_flammability' | 'smoke_detection' | 'gaseous' | 'droplet' | 'general';

export interface ContextEntry {
  id: string;
  kind: ContextKind;
  topic: ContextTopic;
  title: string;
  text: string;
  /** Unreviewed Burmese draft, or null. */
  text_my: string | null;
  /** The NASA page R1 checked the entry against (null until then). */
  source_url: string | null;
  /** R1's own full name once checked (null until then). */
  verified_by: string | null;
}

const unsigned = { source_url: null, verified_by: null } as const;

export const CONTEXT_ENTRIES: readonly ContextEntry[] = [
  // ISS facilities
  { id: 'facility-cir', kind: 'facility', topic: 'general', title: 'Combustion Integrated Rack (CIR)',
    text: 'An ISS research facility for combustion experiments. It hosted the ACME series of gaseous-flame experiments and, with the MDCA insert, droplet-combustion experiments.',
    text_my: null, ...unsigned },
  { id: 'facility-mdca', kind: 'facility', topic: 'droplet', title: 'Multi-user Droplet Combustion Apparatus (MDCA)',
    text: 'An insert for the CIR used for liquid fuel-droplet experiments such as FLEX. Droplet combustion appears here as context only; IGNIS catalogs solid materials.',
    text_my: null, ...unsigned },
  { id: 'facility-msg', kind: 'facility', topic: 'general', title: 'Microgravity Science Glovebox (MSG)',
    text: 'An enclosed ISS work volume for smaller experiments. Solid-fuel flame-spread tests such as BASS and BASS-II ran in it, as did gaseous-flame tests such as SPICE and SLICE.',
    text_my: null, ...unsigned },
  { id: 'facility-cygnus-saffire', kind: 'facility', topic: 'solid_flammability', title: 'Cygnus cargo vehicles (Saffire)',
    text: 'The Saffire experiments burned large material samples inside uncrewed Cygnus cargo vehicles after they left the ISS and before reentry, to study fire at spacecraft scale.',
    text_my: null, ...unsigned },

  // PSI investigations (names to confirm against NASA's pages)
  { id: 'psi-bass', kind: 'investigation', topic: 'solid_flammability', title: 'Burning and Suppression of Solids (BASS, BASS-II)',
    text: 'Studied how flames spread over, and go out on, solid fabrics and plastics in slow airflow in microgravity.',
    text_my: 'ဆွဲငင်အားမဲ့ပတ်ဝန်းကျင် လေစီးနှုန်းနိမ့်အတွင်း အစိုင်အခဲအထည်နှင့် ပလတ်စတစ်များ မီးကူးစက်မှုနှင့် ငြှိမ်းသတ်နိုင်စွမ်းကို တိုင်းတာခြင်း။', ...unsigned },
  { id: 'psi-saffire', kind: 'investigation', topic: 'solid_flammability', title: 'Spacecraft Fire Experiment (Saffire)',
    text: 'Measured how fire grows on spacecraft-scale material samples, and how its heat and combustion products spread, inside an uncrewed vehicle.',
    text_my: 'လူမဲ့အာကာသယာဉ်အတွင်း အရွယ်အစားကြီး အထည်နှင့် ပေါင်းစပ်ပစ္စည်းများ မီးကြီးထွားမှုနှင့် အပူထုတ်လွှတ်နှုန်းကို တိုင်းတာခြင်း။', ...unsigned },
  { id: 'psi-bre', kind: 'investigation', topic: 'gaseous', title: 'Burning Rate Emulator (BRE, part of ACME)',
    text: 'Burned gaseous fuels to emulate how solid materials burn in still air.',
    text_my: 'လေငြိမ်အာကာသအခန်းအတွင်း ဓာတ်ငွေ့လောင်စာဖြင့် အစိုင်အခဲပစ္စည်းများ၏ မီးလောင်လွယ်မှုကို တုပတွက်ချက်ခြင်း။', ...unsigned },
  { id: 'psi-spice-slice', kind: 'investigation', topic: 'gaseous', title: 'Smoke Point In Co-flow Experiment (SPICE) and Structure and Liftoff In Combustion Experiment (SLICE)',
    text: 'Studied when gaseous flames start to produce soot (SPICE) and how they lift off and blow out (SLICE) in a surrounding airflow.',
    text_my: 'လေစီးကြောင်းအတွင်း ကျပ်ခိုးစတင်ထွက်ရှိမှု အကန့်အသတ် (SPICE) နှင့် မီးလျှံတည်ငြိမ်မှု (SLICE) ကို တိုင်းတာခြင်း။', ...unsigned },
  { id: 'psi-acme-cfig-efield', kind: 'investigation', topic: 'gaseous', title: 'Cool Flames Investigation with Gases (CFI-G) and E-FIELD Flames (ACME)',
    text: 'Studied gaseous flames in oxygen-enriched conditions, and how electric fields affect flames.',
    text_my: null, ...unsigned },
  { id: 'psi-same', kind: 'investigation', topic: 'smoke_detection', title: 'Smoke Aerosol Measurement Experiment (SAME)',
    text: 'Measured smoke particles from overheated materials in microgravity to improve spacecraft smoke detection.',
    text_my: 'အာကာသယာဉ် မီးဘေးကြိုတင်ထောက်လှမ်းမှု တိကျစေရန်နှင့် မှားယွင်းအချက်ပေးမှု လျှော့ချရန် မီးခိုးအမှုန်အရွယ်အစား တိုင်းတာခြင်း။', ...unsigned },
  { id: 'psi-daft', kind: 'investigation', topic: 'smoke_detection', title: 'Dust and Aerosol measurement Feasibility Test (DAFT)',
    text: 'Tested whether a smoke-detection instrument can measure airborne dust, to help tell dust apart from smoke.',
    text_my: 'လကမ္ဘာဖုန်မှုန့်နှင့် မီးခိုးကို ခွဲခြားထောက်လှမ်းနိုင်ရန် SAME မီးခိုးအာရုံခံကိရိယာကို ပြန်လည်အသုံးချ စမ်းသပ်ခြင်း။', ...unsigned },
  { id: 'psi-flex', kind: 'investigation', topic: 'droplet', title: 'Flame Extinguishment Experiment (FLEX, FLEX-2)',
    text: 'Burned isolated liquid fuel droplets to study how flames go out, including with diluent gases added.',
    text_my: 'ကာဗွန်ဒိုင်အောက်ဆိုဒ် (CO₂) နှင့် ဟီလီယမ် (Helium) ရောစပ်မှုအောက်တွင် လောင်စာအစက် မီးလောင်မှုနှင့် ငြှိမ်းသတ်မှုကို တိုင်းတာခြင်း။', ...unsigned },
  { id: 'psi-cfi-mist', kind: 'investigation', topic: 'droplet', title: 'Cool Flames Investigation (CFI) and water-mist suppression',
    text: 'Studied "cool flames" around fuel droplets, and putting out fires with fine water mist.',
    text_my: 'ဆွဲငင်အားမဲ့ပတ်ဝန်းကျင်တွင် အေးမြမီးလျှံ (Cool Flames) နှင့် ရေမှုန်မွှား မီးငြှိမ်းသတ်စနစ်ကို လေ့လာခြင်း။', ...unsigned },

  // Earth spinoffs (to confirm against NASA Spinoff)
  { id: 'spinoff-water-mist', kind: 'spinoff', topic: 'general', title: 'Water-mist fire suppression',
    text: 'Research on fire suppression with fine water mist in microgravity fed into water-mist systems used on Earth.',
    text_my: null, ...unsigned },
  { id: 'spinoff-smoke-detection', kind: 'spinoff', topic: 'smoke_detection', title: 'Smoke detection',
    text: 'Smoke-particle measurements from SAME and DAFT inform smoke detectors that can tell dust or steam apart from smoke.',
    text_my: null, ...unsigned },
  { id: 'spinoff-firefighter-gear', kind: 'spinoff', topic: 'general', title: 'Firefighter equipment',
    text: 'Flame-resistant fabrics and lightweight breathing-air tanks developed for spaceflight are used by firefighters.',
    text_my: null, ...unsigned },

  // Heritage
  { id: 'heritage-apollo-1', kind: 'heritage', topic: 'general', title: 'Apollo 1 (1967)',
    text: 'On 27 January 1967, fire swept the Apollo 1 command module during a ground test in a pure-oxygen cabin atmosphere, killing astronauts Virgil "Gus" Grissom, Edward White II and Roger Chaffee. NASA then changed the spacecraft\'s launch cabin atmosphere and its materials requirements.',
    text_my: null, ...unsigned },
];

/** Entries allowed to render: signed by a real person, with the NASA page they checked. */
export const renderableContext = (entries: readonly ContextEntry[] = CONTEXT_ENTRIES) =>
  entries.filter((e) => !verifierNameProblem(e.verified_by) && !!e.source_url && /^https:\/\//.test(e.source_url));
