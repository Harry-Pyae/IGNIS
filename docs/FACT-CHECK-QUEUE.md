# Fact-check queue — R1

Everything here is **hidden from the app** until you check it against the named NASA source and sign it with your
own full name. Nothing goes live on a placeholder. Send Coder A, for each item: the values or wording you confirm (or
correct), the exact source URL, and your name. Coder A then updates the code. (DECISIONS-ROUND5 #1 and #3.)

These are context and scenario inputs, **not catalog cards**: this queue doesn't change the in-window rule for card
extraction and verification.

## A. Environment presets (`src/engine/environments.ts`)

Each preset sets only oxygen and pressure. Confirm the figures **and** the one-line context sentence.

| Preset | Placeholder now | What to confirm | Source to check | Confirmed values + URL | Signed |
|---|---|---|---|---|---|
| ISS baseline | 21% O₂, 101.325 kPa (14.7 psi) | Nominal ISS cabin atmosphere; sentence: "The ISS cabin is kept at Earth-normal air: about 21% oxygen at sea-level pressure." | NASA ISS ECLSS documentation | | |
| Exploration / Moon-base atmosphere | **30% O₂, 10.2 psi (70.3 kPa)**: unsourced practice-build figures | Both figures. I recall the NASA Exploration Atmospheres Working Group recommending about **34% O₂ at 8.2 psia**, and 10.2 psi as the Shuttle pre-EVA staging pressure at a different O₂ fraction. Use what the source states. Sentence: "Proposed exploration habitats lower the pressure and raise the oxygen fraction to shorten spacesuit pre-breathe." | NASA/TP-2010-216134, *Recommendations for Exploration Spacecraft Internal Atmospheres: The Final Report of the NASA Exploration Atmospheres Working Group* (NTRS) | | |
| Spacesuit EVA | **100% O₂, 4.3 psi (29.6 kPa)**: unsourced practice-build figures | EMU operating pressure and atmosphere; sentence: "The spacesuit runs on pure oxygen at low pressure, which keeps the suit flexible." | NASA Extravehicular Mobility Unit (EMU) documentation | | |

## B. Context entries (`src/lib/context-content.ts`)

Adapted from a teammate's practice build, with every figure removed. **Check each sentence and the official name** against
NASA's own page (PSI investigation pages, NASA ISS research pages, NASA Spinoff, NASA History Office). Fix anything
inexact; a sentence you can't source gets cut, not softened.

| Entry | What to check | Suggested source | URL | Signed |
|---|---|---|---|---|
| `facility-cir` | CIR description; that it hosted ACME and (with MDCA) droplet experiments | NASA Glenn CIR page / ISS research explorer | | |
| `facility-mdca` | MDCA is a CIR insert used for FLEX-type droplet experiments | NASA Glenn MDCA page | | |
| `facility-msg` | MSG hosted BASS, BASS-II, SPICE and SLICE | NASA MSG page / ISS research explorer | | |
| `facility-cygnus-saffire` | Saffire ran in departed Cygnus vehicles before reentry | NASA Saffire page | | |
| `psi-bass` | Name and summary | PSI investigation page (BASS) | | |
| `psi-saffire` | Name and summary | NASA Saffire page | | |
| `psi-bre` | Name; BRE is part of ACME; "emulate how solid materials burn" | PSI / ACME page | | |
| `psi-spice-slice` | Full names (SPICE, SLICE) and summary | PSI pages | | |
| `psi-acme-cfig-efield` | Names (CFI-G, E-FIELD Flames) and summary | ACME pages | | |
| `psi-same` | Official name ("Smoke Aerosol Measurement Experiment"?) and summary | PSI / NASA Glenn page | | |
| `psi-daft` | Official name and summary | NASA page | | |
| `psi-flex` | Name and summary (droplet: context only) | PSI page | | |
| `psi-cfi-mist` | Whether an ISS water-mist experiment existed, or whether the mist work was elsewhere (e.g. a Shuttle experiment). Correct or cut | NASA pages | | |
| `spinoff-water-mist` | That this is a documented NASA spinoff | NASA Spinoff | | |
| `spinoff-smoke-detection` | That SAME/DAFT results inform commercial detectors | NASA Spinoff / Glenn | | |
| `spinoff-firefighter-gear` | Documented spinoff for fabrics and breathing tanks | NASA Spinoff | | |
| `heritage-apollo-1` | Date, crew names, ground test in pure-O₂ cabin, the changes NASA made afterwards | NASA History Office | | |

## C. Still open from earlier rounds

- The three seed cards, plus the GMT45-T4 changing-flow decision (in the event window, `docs/MILESTONES.md` §12).
- A real wire/cable insulation card and a cargo packaging card, to activate those two material presets (AGENTS.md → Open handoffs).
