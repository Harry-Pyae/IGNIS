# Burmese (MY) review — R3

**Status: UNREVIEWED draft.** Source: `src/i18n/my.draft.ts` (generated 2026-11-11; regenerate after key changes).

**Rule (Team Plan R3, DECISIONS-ROUND5 #2):** Burmese ships **complete and reviewed**, or the app stays EN-only. A partial set never ships.

The draft comes from a teammate's practice build (Pyroverse, used with her permission): strings only. Her build covers a different UI (3D chamber, audit, chatbot), so only **3 of our 144 keys** have a direct equivalent. The rest are blank for you to write; the glossary in §2 has her terms.

**How to review:**
- Fill *R3 translation* for every key (keep her draft or replace it), then tick *Native ✓* and *Scientific ✓* once checked.
- Keep scientific terms consistent with the glossary.
- Never make the approved meaning stronger: absence stays "no matching verified evidence in the current IGNIS catalog" (never "NASA never tested"); no "predict", "safe" or "approved".
- When every row has both ticks, send this file to Coder A, who promotes it into `src/i18n/index.ts`.

## 1. UI strings (144 keys)

| Key | English | Her draft | R3 translation | Native ✓ | Scientific ✓ | Notes |
|---|---|---|---|---|---|---|
| `missionScenario` | Mission scenario |  |  |  |  |  |
| `evidenceMap` | Evidence map |  |  |  |  |  |
| `matchPanel` | Match panel |  |  |  |  |  |
| `missionBrief` | Mission brief |  |  |  |  |  |
| `evidenceGapRadar` | Evidence gap radar |  |  |  |  |  |
| `describeStep` | 01 · Describe |  |  |  |  |  |
| `retrieveStep` | 02 · Retrieve |  |  |  |  |  |
| `matchesStep` | 03 · Why these |  |  |  |  |  |
| `briefStep` | 04 · Evidence-validated claims |  |  |  |  |  |
| `gapStep` | 05 · Research prioritization |  |  |  |  |  |
| `scenarioPresets` | Scenario presets |  |  |  |  |  |
| `environments` | Environments | လေထုပုံစံများ |  |  |  |  |
| `custom` | Custom |  |  |  |  |  |
| `scenarioPresetsStart` | Start with a preset |  |  |  |  |  |
| `orDescribeScenario` | Or describe a scenario |  |  |  |  |  |
| `scenarioExample` | Example: PMMA wall panel, 21% oxygen, 10 cm/s airflow |  |  |  |  |  |
| `parseScenario` | Parse scenario |  |  |  |  |  |
| `parsing` | Parsing… |  |  |  |  |  |
| `material` | Material | ပစ္စည်း |  |  |  |  |
| `form` | Form |  |  |  |  |  |
| `notSpecified` | Not specified |  |  |  |  |  |
| `notReported` | Not reported |  |  |  |  |  |
| `setAirflow` | Set airflow to 0 cm/s |  |  |  |  |  |
| `clearAirflow` | Clear airflow |  |  |  |  |  |
| `setOxygen` | Set to 21% (cabin air) |  |  |  |  |  |
| `clearOxygen` | Clear oxygen |  |  |  |  |  |
| `enterMaterial` | Enter a material |  |  |  |  |  |
| `selectMaterial` | Select material |  |  |  |  |  |
| `chooseCatalogMaterial` | Choose a verified catalog material to continue. |  |  |  |  |  |
| `chooseAmbiguousMaterial` | Choose which catalog material you mean. |  |  |  |  |  |
| `catalogMaterialsUnavailable` | Verified catalog materials could not be loaded. |  |  |  |  |  |
| `retry` | Retry |  |  |  |  |  |
| `confirmScenario` | Confirm scenario |  |  |  |  |  |
| `edit` | Edit |  |  |  |  |  |
| `outcome` | Outcome |  |  |  |  |  |
| `missionBack` | Back |  |  |  |  |  |
| `missionNext` | Next |  |  |  |  |  |
| `missionDone` | Done |  |  |  |  |  |
| `exploreFreely` | Explore freely |  |  |  |  |  |
| `guidedMission` | Guided mission |  |  |  |  |  |
| `missionStepOf` | Step {n} of {total} |  |  |  |  |  |
| `missionProgress` | Guided mission steps |  |  |  |  |  |
| `goToMissionStep` | Go to step |  |  |  |  |  |
| `missionStepScenario` | Describe the scenario |  |  |  |  |  |
| `missionStepMap` | Inspect the observations |  |  |  |  |  |
| `missionStepMatches` | Compare the matched tests |  |  |  |  |  |
| `missionStepBrief` | Read the evidence brief |  |  |  |  |  |
| `missionStepGaps` | Check the evidence gaps |  |  |  |  |  |
| `missionCaptionScenario` | Review the scenario inputs, then confirm them before comparing experiments. |  |  |  |  |  |
| `missionCaptionMap` | The map plots verified experiments with reported oxygen and airflow values. |  |  |  |  |  |
| `missionCaptionMatches` | Compare reported conditions, outcomes, observations, and source locations across the closest catalog matches. |  |  |  |  |  |
| `missionCaptionBrief` | Observed results and supported interpretations are shown separately; citations lead back to matched evidence. |  |  |  |  |  |
| `missionCaptionGaps` | Review the conditions where this catalog has no matching verified evidence. |  |  |  |  |  |
| `understandResearch` | Understand the research |  |  |  |  |  |
| `whereItHappened` | Where it happened |  |  |  |  |  |
| `whatItStudied` | What it studied |  |  |  |  |  |
| `whyItMatters` | Why it matters |  |  |  |  |  |
| `confirmedMatches` | ranked matches ready |  |  |  |  |  |
| `confirmed` | Confirmed |  |  |  |  |  |
| `confirmedCatalog` | Scenario confirmed. Results use verified catalog records only. |  |  |  |  |  |
| `confirmedCatalogUnavailable` | Scenario confirmed. Connect the verified catalog to retrieve experiment results. |  |  |  |  |  |
| `closestMatch` | Closest verified match |  |  |  |  |  |
| `confirmForClosestMatch` | Confirm the scenario to compare it with verified catalog experiments. |  |  |  |  |  |
| `editScenario` | Edit scenario |  |  |  |  |  |
| `noMatchCatalog` | Catalog is unavailable, so there are no verified matches to compare yet. |  |  |  |  |  |
| `noEligibleMatchesForScenario` | No verified catalog experiments match this scenario yet. |  |  |  |  |  |
| `catalogConnecting` | Connecting to the verified experiment catalog… |  |  |  |  |  |
| `catalogNotConnected` | Catalog not connected. Add SUPABASE_URL and SUPABASE_ANON_KEY to your local .env file, then restart the dev server. |  |  |  |  |  |
| `mapNoPoints` | No verified records with both oxygen and airflow values are available to plot yet. |  |  |  |  |  |
| `mapAccessibility` | Evidence map plotting oxygen against airflow |  |  |  |  |  |
| `mapVerifiedTitle` | Verified experiment outcomes by airflow and oxygen concentration |  |  |  |  |  |
| `airflowAxis` | Airflow (cm/s) | လေစီးနှုန်း (cm/s) |  |  |  |  |
| `oxygenAxis` | O₂ (%) |  |  |  |  |  |
| `sustained` | Sustained |  |  |  |  |  |
| `extinguished` | Extinguished |  |  |  |  |  |
| `transition` | Transition |  |  |  |  |  |
| `partial` | Partial |  |  |  |  |  |
| `outcomeNotReported` | Outcome not reported |  |  |  |  |  |
| `scenario` | Scenario |  |  |  |  |  |
| `untestedCell` | Untested cell |  |  |  |  |  |
| `outsideAxesRecords` | records fall outside the plotted axes and are not shown. |  |  |  |  |  |
| `outsideAxesRecord` | record falls outside the plotted axes and is not shown. |  |  |  |  |  |
| `outsideCatalogRange` | Outside catalog range |  |  |  |  |  |
| `plotted` | plotted |  |  |  |  |  |
| `rankedMatches` | ranked matches |  |  |  |  |  |
| `confirmForMatches` | Confirm a scenario to see the closest eligible experiments. |  |  |  |  |  |
| `waitingCatalog` | Waiting for the verified catalog snapshot. |  |  |  |  |  |
| `matchCatalogUnavailable` | Catalog not connected. Connect the verified catalog to load experiment matches. |  |  |  |  |  |
| `noVerifiedMatches` | No eligible verified experiments match this scenario in the current catalog. |  |  |  |  |  |
| `match` | Match |  |  |  |  |  |
| `sourceExcerpt` | Source excerpt |  |  |  |  |  |
| `nasaPaperPdf` | NASA paper PDF |  |  |  |  |  |
| `source` | Source |  |  |  |  |  |
| `confirmForBrief` | Confirm a scenario to build its evidence-checked brief. |  |  |  |  |  |
| `noBriefMatches` | No matched experiments are available for a mission brief. |  |  |  |  |  |
| `preparingBrief` | Preparing the evidence-checked brief… |  |  |  |  |  |
| `buildingBrief` | Building the mission brief from matched records… |  |  |  |  |  |
| `matchedEvidenceOnly` | Matched evidence only |  |  |  |  |  |
| `observed` | Observed |  |  |  |  |  |
| `supportedInterpretation` | Supported interpretation |  |  |  |  |  |
| `untested` | Untested |  |  |  |  |  |
| `gap` | Gap |  |  |  |  |  |
| `catalogUnavailableForMaterials` | Verified catalog materials could not be loaded. |  |  |  |  |  |
| `loadingCoverage` | Loading catalog coverage… |  |  |  |  |  |
| `coverageUnavailable` | Catalog not connected. Connect the verified catalog to load evidence coverage. |  |  |  |  |  |
| `noScenarioRange` | No eligible records in this scenario provide both oxygen and airflow values, so there is no measured range for ranking gaps. |  |  |  |  |  |
| `noCatalogRange` | No verified records provide both oxygen and airflow values, so there is no measured range for ranking gaps. |  |  |  |  |  |
| `largestUntestedRegions` | Largest untested regions inside the catalog range |  |  |  |  |  |
| `region` | Region |  |  |  |  |  |
| `untestedCells` | untested cells |  |  |  |  |  |
| `noUntestedCells` | No untested cells were found inside the current catalog range. |  |  |  |  |  |
| `thinMaterials` | Materials with fewer than three verified records |  |  |  |  |  |
| `record` | record |  |  |  |  |  |
| `records` | records |  |  |  |  |  |
| `eligibleRecord` | eligible record |  |  |  |  |  |
| `eligibleRecords` | eligible records |  |  |  |  |  |
| `missingAxisRecord` | lacks oxygen or airflow values and is not plotted. |  |  |  |  |  |
| `missingAxisRecords` | lack oxygen or airflow values and are not plotted. |  |  |  |  |  |
| `loading` | Loading… |  |  |  |  |  |
| `outcomeUnreported` | Outcome unreported |  |  |  |  |  |
| `beyondCatalogRange` | Beyond the current catalog range |  |  |  |  |  |
| `noPlottedTest` | No plotted test in this oxygen and airflow cell |  |  |  |  |  |
| `catalogEnvelope` | Current catalog envelope |  |  |  |  |  |
| `thicknessMm` | Thickness (mm) |  |  |  |  |  |
| `pressureKpa` | Pressure (kPa) |  |  |  |  |  |
| `matched` | matched |  |  |  |  |  |
| `eligible` | eligible |  |  |  |  |  |
| `oxygenNotReported` | O₂ not reported |  |  |  |  |  |
| `airflowNotReported` | Airflow not reported |  |  |  |  |  |
| `sourcePage` | Source p. |  |  |  |  |  |
| `backToMap` | Back to evidence map |  |  |  |  |  |
| `openMatchCard` | Open its match card |  |  |  |  |  |
| `noUntestedWithinRange` | No untested cells were found inside the current catalog range. |  |  |  |  |  |
| `thinMaterialsHeading` | Materials with fewer than three verified records |  |  |  |  |  |
| `openDataset` | Open dataset (.json) |  |  |  |  |  |
| `backToTop` | Back to top |  |  |  |  |  |
| `oneIdea` | The one idea |  |  |  |  |  |
| `refusesToGuess` | IGNIS refuses to guess. It renders the absence of evidence as a visible, first-class feature. |  |  |  |  |  |
| `whatTestReported` | What a NASA test directly reported. |  |  |  |  |  |
| `carefulReading` | Careful reading across cited tests. |  |  |  |  |  |
| `noMatchingEvidence` | No matching verified evidence in the current catalog. Shown, never filled in. |  |  |  |  |  |
| `experimentDataSources` | Experiment data: NASA Technical Reports Server (NTRS) and NASA Physical Sciences Informatics (PSI). Each card links to and credits its own source. |  |  |  |  |  |
| `nasaDisclaimer` | IGNIS is an independent NASA Space Apps project. Not affiliated with or endorsed by NASA. |  |  |  |  |  |
| `brandingArt` | Illustrations on this page are branding — not NASA experiment imagery. |  |  |  |  |  |

## 2. Glossary (terms from her strings)

| English | Her Burmese | Check | R3 ✓ |
|---|---|---|---|
| Oxygen | အောက်ဆီဂျင် |  |  |
| Airflow | လေစီးနှုန်း |  |  |
| Material | ပစ္စည်း |  |  |
| Fabric | အထည် |  |  |
| Solid (material) | အစိုင်အခဲ |  |  |
| Flame | မီးလျှံ |  |  |
| Smoke | မီးခိုး |  |  |
| Fuel droplet | လောင်စာအစက် |  |  |
| Extinguishment | ငြှိမ်းသတ် |  |  |
| Detection | ထောက်လှမ်းရေး |  |  |
| Prevention | ကြိုတင်ကာကွယ်ရေး |  |  |
| Suppression | မီးငြှိမ်းသတ်ရေး |  |  |
| Spacecraft | အာကာသယာဉ် |  |  |
| Microgravity environment | ဆွဲငင်အားမဲ့ပတ်ဝန်းကျင် |  |  |
| Spacesuit | အာကာသဝတ်စုံ |  |  |
| Moon | လကမ္ဘာ |  |  |
| Investigation / experiment | စမ်းသပ်မှု |  |  |
| Search | ရှာဖွေရေး |  |  |
| Back | ရှေ့သို့ | Her "Back" button. Reads as "forward"; looks swapped with Next. Check. |  |
| Next | နောက်သို့ | Her "Next" button. Reads as "behind"; looks swapped with Back. Check. |  |
| Done / close | ပိတ်မည် |  |  |

## 3. Burmese material phrases for the alias resolver (staged, not live)

Approved rows go into `MATERIAL_ALIASES` / `CLASS_HINTS` (`src/engine/aliases.ts`), and only for materials that exist in our catalog. Reject any phrase that could mean more than one material: the resolver never guesses.

| Phrase | Meaning | Proposed mapping | R3 ✓ | R1 ✓ (material) |
|---|---|---|---|---|
| နိုမက်စ် | Nomex (transliteration) | `nomex` (aramid_fabric) |  |  |
| ချည်နှင့် ဖန်မျှင်ရောစပ် အထည် | cotton and fiberglass blended fabric | `cotton_fiberglass` (fabric) |  |  |
| အထည် | fabric (a class, not a material) | class hint: `fabric` |  |  |

## 4. Context content (`src/lib/context-content.ts`)

Her Burmese exists only where her build had one without figures. R1 fact-checks the English first (`docs/FACT-CHECK-QUEUE.md`); then review or translate here.

| Entry | English | Her draft | R3 translation | Native ✓ | Scientific ✓ |
|---|---|---|---|---|---|
| `facility-cir` | An ISS research facility for combustion experiments. It hosted the ACME series of gaseous-flame experiments and, with the MDCA insert, droplet-combustion experiments. |  |  |  |  |
| `facility-mdca` | An insert for the CIR used for liquid fuel-droplet experiments such as FLEX. Droplet combustion appears here as context only; IGNIS catalogs solid materials. |  |  |  |  |
| `facility-msg` | An enclosed ISS work volume for smaller experiments. Solid-fuel flame-spread tests such as BASS and BASS-II ran in it, as did gaseous-flame tests such as SPICE and SLICE. |  |  |  |  |
| `facility-cygnus-saffire` | The Saffire experiments burned large material samples inside uncrewed Cygnus cargo vehicles after they left the ISS and before reentry, to study fire at spacecraft scale. |  |  |  |  |
| `psi-bass` | Studied how flames spread over, and go out on, solid fabrics and plastics in slow airflow in microgravity. | ဆွဲငင်အားမဲ့ပတ်ဝန်းကျင် လေစီးနှုန်းနိမ့်အတွင်း အစိုင်အခဲအထည်နှင့် ပလတ်စတစ်များ မီးကူးစက်မှုနှင့် ငြှိမ်းသတ်နိုင်စွမ်းကို တိုင်းတာခြင်း။ |  |  |  |
| `psi-saffire` | Measured how fire grows on spacecraft-scale material samples, and how its heat and combustion products spread, inside an uncrewed vehicle. | လူမဲ့အာကာသယာဉ်အတွင်း အရွယ်အစားကြီး အထည်နှင့် ပေါင်းစပ်ပစ္စည်းများ မီးကြီးထွားမှုနှင့် အပူထုတ်လွှတ်နှုန်းကို တိုင်းတာခြင်း။ |  |  |  |
| `psi-bre` | Burned gaseous fuels to emulate how solid materials burn in still air. | လေငြိမ်အာကာသအခန်းအတွင်း ဓာတ်ငွေ့လောင်စာဖြင့် အစိုင်အခဲပစ္စည်းများ၏ မီးလောင်လွယ်မှုကို တုပတွက်ချက်ခြင်း။ |  |  |  |
| `psi-spice-slice` | Studied when gaseous flames start to produce soot (SPICE) and how they lift off and blow out (SLICE) in a surrounding airflow. | လေစီးကြောင်းအတွင်း ကျပ်ခိုးစတင်ထွက်ရှိမှု အကန့်အသတ် (SPICE) နှင့် မီးလျှံတည်ငြိမ်မှု (SLICE) ကို တိုင်းတာခြင်း။ |  |  |  |
| `psi-acme-cfig-efield` | Studied gaseous flames in oxygen-enriched conditions, and how electric fields affect flames. |  |  |  |  |
| `psi-same` | Measured smoke particles from overheated materials in microgravity to improve spacecraft smoke detection. | အာကာသယာဉ် မီးဘေးကြိုတင်ထောက်လှမ်းမှု တိကျစေရန်နှင့် မှားယွင်းအချက်ပေးမှု လျှော့ချရန် မီးခိုးအမှုန်အရွယ်အစား တိုင်းတာခြင်း။ |  |  |  |
| `psi-daft` | Tested whether a smoke-detection instrument can measure airborne dust, to help tell dust apart from smoke. | လကမ္ဘာဖုန်မှုန့်နှင့် မီးခိုးကို ခွဲခြားထောက်လှမ်းနိုင်ရန် SAME မီးခိုးအာရုံခံကိရိယာကို ပြန်လည်အသုံးချ စမ်းသပ်ခြင်း။ |  |  |  |
| `psi-flex` | Burned isolated liquid fuel droplets to study how flames go out, including with diluent gases added. | ကာဗွန်ဒိုင်အောက်ဆိုဒ် (CO₂) နှင့် ဟီလီယမ် (Helium) ရောစပ်မှုအောက်တွင် လောင်စာအစက် မီးလောင်မှုနှင့် ငြှိမ်းသတ်မှုကို တိုင်းတာခြင်း။ |  |  |  |
| `psi-cfi-mist` | Studied "cool flames" around fuel droplets, and putting out fires with fine water mist. | ဆွဲငင်အားမဲ့ပတ်ဝန်းကျင်တွင် အေးမြမီးလျှံ (Cool Flames) နှင့် ရေမှုန်မွှား မီးငြှိမ်းသတ်စနစ်ကို လေ့လာခြင်း။ |  |  |  |
| `spinoff-water-mist` | Research on fire suppression with fine water mist in microgravity fed into water-mist systems used on Earth. |  |  |  |  |
| `spinoff-smoke-detection` | Smoke-particle measurements from SAME and DAFT inform smoke detectors that can tell dust or steam apart from smoke. |  |  |  |  |
| `spinoff-firefighter-gear` | Flame-resistant fabrics and lightweight breathing-air tanks developed for spaceflight are used by firefighters. |  |  |  |  |
| `heritage-apollo-1` | On 27 January 1967, fire swept the Apollo 1 command module during a ground test in a pure-oxygen cabin atmosphere, killing astronauts Virgil "Gus" Grissom, Edward White II and Roger Chaffee. NASA then changed the spacecraft's launch cabin atmosphere and its materials requirements. |  |  |  |  |

## 5. Inventory: every Burmese string in her build

Her build has **254 distinct Burmese strings** across 12 files (counted 2026-11-10; *with figures* = the string contains Western or Burmese digits). Sections 1–4 hold everything we took. The rest stays in her repo on purpose, for the reason given. Check a file there if you want her wording for a term.

| Her file | Strings | With figures | What we did |
|---|---|---|---|
| `context/LanguageContext.tsx` (her UI dictionary) | 40 | 11 | Equivalents mapped to our keys (§1) and terms in the glossary (§2). Strings for her own features have no key here. |
| `components/DemoGuideModal.tsx` | 16 | 4 | Step-guide pattern handed to Coder B (DECISIONS-ROUND5 #4); Back / Next noted in §2 (they look swapped). |
| `app/page.tsx`, `app/search/page.tsx` | 18 + 13 | 7 + 1 | Terms only, where we have the same concept (§2). |
| `lib/materialsData.ts` (her materials dataset) | 85 | 10 | Material names for catalog materials staged in §3. Descriptions, ratings and figures **not taken**: the dataset is unsourced. |
| `lib/ignisAiEngine.ts` | 60 | 24 | **Not taken**: generated burn behaviour and derived figures (rejected: derived burn formula, prediction). |
| `components/CustomMaterialModal.tsx` | 26 | 2 | **Not taken**: her custom-material scoring flow has no IGNIS equivalent. |
| `components/AuditReportPrint.tsx`, `app/audit/page.tsx` | 24 + 1 | 4 + 0 | **Not taken**: audit / compliance framing (rejected). |
| `components/AIInsightsPanel.tsx` | 10 | 2 | **Not taken**: chat / AI insights (rejected). |
| `app/dashboard/page.tsx` | 4 | 1 | **Not taken**: no equivalent surface. |
| `components/FlameChamber3D.tsx` | 2 | 1 | **Not taken**: 3D flame chamber (rejected). |

The per-file counts overlap where the same string appears in two files, so they add up to more than 254.
