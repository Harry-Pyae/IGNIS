# Round 5 decisions (Coder A, 2026-11-10)

Selected content from **Pyroverse**, a teammate's practice build, used with her permission. Round 2–4 decisions stand.

**Hard rule for this round:** we adopt her **content and UX patterns**, never her **code** (Next 16 / React 19 /
three.js doesn't merge into our stack), and never her **data values**. Every number in her materials dataset (burn
rates, LOI, safety scores, costs) is unsourced and must not enter our catalog, copy or types. The only figures taken
are the two environment presets' values, and they go in as flagged placeholders behind R1 verification (#1).

## Adopted

| # | Decision | Where | Affects |
|---|---|---|---|
| 1 | **Environment presets as honest gap demos.** A second preset row, "Environments", distinct from material presets: ISS baseline, Exploration / Moon-base atmosphere, Spacesuit EVA. Each sets only oxygen and pressure (airflow, material, form and thickness untouched), keeps the pressure in its original units, and shows a one-line context note plus an elevated-O₂ note above 21%. The caption frames the outside-range result as the point: *"Use them to see where the verified catalog's evidence ends."* **Gate:** a preset renders only when R1 has verified it (status, real name, source URL); all three are placeholders now, so the row stays hidden. **Contract change:** new `EnvironmentPreset` type and `applyEnvironment()` in `src/engine/environments.ts`; no change to `ParsedScenario` / `ResolvedScenario`; new approved copy `COPY.environmentCaption`, `COPY.elevatedO2`; i18n key `environments`. Tested in `tests/environments.test.ts`. | `src/engine/environments.ts`, `src/pages/Console.tsx` | Coder A, R1 |
| 2 | **Burmese draft set behind R3 review.** Her strings map onto our keys as `src/i18n/my.draft.ts` (3 of 123 keys have direct equivalents; plus a 21-term glossary). It is marked UNREVIEWED and **can't ship**: `tests/my-draft-guard.test.ts` fails CI if anything in `src/` or `api/` imports it, if a `my` locale appears, or if a staged alias goes live. Her Burmese material phrases are staged as alias candidates (Nomex, the cotton-fiberglass blend name, a fabric class hint), and they go into the resolver tables only after R3 signs them, and only for materials in our catalog. Review sheet: `docs/MY-REVIEW.md`. The standing rule holds: MY ships complete and reviewed, or EN-only. | `src/i18n/my.draft.ts`, `docs/MY-REVIEW.md` | Coder A, R3 |
| 3 | **Verified context content.** `src/lib/context-content.ts`: typed entries for ISS facilities (CIR, MDCA, MSG, Cygnus/Saffire), PSI investigation summaries, Earth spinoffs and the Apollo 1 note, each `{text, text_my, source_url, verified_by}`. An entry renders **only** when R1 has signed it with a source (`renderableContext()`). Context / learn surface and guided-mission captions **only**, never evidence cards, the map or the Brief. Droplet / gaseous / smoke topics may appear as context; nothing from those domains is ever carded. No figures carried over; her "predict" phrasing rewritten. Tested in `tests/context-content.test.ts`. | `src/lib/context-content.ts`, `docs/FACT-CHECK-QUEUE.md` | Coder A, R1, Coder B later |
| 4 | **Demo-guide UX pattern** (steps + EN/MY toggle + progress dots, Back / Next / Done) is approved input for the Round 4 guided mission. Pattern only, no code. | Handoff below | Coder B |
| 5 | **NASA SVS imagery via the media ledger.** Her `public/images/svs-*.jpg` look like NASA Scientific Visualization Studio assets; none can be used until R2 traces each to its original SVS page and ledgers the credit. | Handoff below | R2 |

## Rejected (stays rejected)

| Rejected | Why |
|---|---|
| Safety scores and any 0–100 rating | A score claims a judgment the evidence can't support (Core Principles 1 and 5). |
| Cost-per-kg and cost/safety optimization | Unsourced figures, and outside the evidence scope. |
| Planetary combustion profile or any derived burn formula | Computed, not observed: that is prediction (Principle 1). |
| 3D flame chamber in the app | A rendered flame looks like evidence; the Build Plan's DO-NOT-BUILD list already excludes 3D flames. |
| NASA-STD-6001B / audit / compliance-report framing | IGNIS doesn't test or certify materials; implying a standards audit would overclaim. |
| Chat bot | Free chat over the corpus is on the DO-NOT-BUILD list; the LLM only parses and narrates validated evidence. |
| Carding droplet or gaseous domains | Domain purity (Principle 4): solid flammability only; FLEX is never carded. |
| "Approved", "Qualified" or "Prohibited" certification language, anywhere | Certification claims IGNIS can't make. |

## Handoffs (documentation only; not implemented)

**Coder B: guided mission UX + Context section**
- Use her demo-guide pattern for the Round 4 mission: a numbered step header with a title and tag, the step body,
  progress dots that jump to a step, *Back / Next* (and *Done* on the last step), and an EN/MY toggle that appears
  only once MY has passed review. Static captions, manual navigation, no autoplay, no video dependency.
- After the mission: render a Context / learn section from `renderableContext()` only (it's empty until R1 signs
  entries). Keep it off evidence cards, the map and the Brief.
- The Environments row is already in `Console.tsx` (hidden until R1 signs a preset); style it as you see fit, keeping
  its caption and notes.

**R2: SVS assets**
- Files in the practice build: `svs-flame-s4.jpg`, `svs-iss-orbit.jpg`, `svs-spherical-flame.jpg`, `svs-starmap-4k.jpg`.
- For each: find the original NASA SVS (svs.gsfc.nasa.gov) page, record origin URL, credit line, what it shows, and
  any test association (only if verifiable; campaign imagery stays "campaign context") in `docs/media-ledger.md`.
  Use none of them before that. The Evidence Map stays a pure plot either way.

**R1: fact-checks**
- `docs/FACT-CHECK-QUEUE.md`: the three environment presets (§A) and the 17 context entries (§B).

**R3: Burmese review**
- `docs/MY-REVIEW.md`: all 123 keys, the glossary (check her Back/Next pair, which looks swapped) and the staged alias phrases.
