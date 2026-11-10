# Round 6 decisions (Coder A, 2026-11-10)

Recorded by Coder A (team lead) after the review "IGNIS feature and design upgrade review 2026-11-10" (kept unedited
outside the repository, like its predecessors). The review is adopted in full; these rulings fix ownership and order.
Round 2–5 decisions stand.

**Preparation-window rules hold:** no card extraction or verification before 2026-11-14; production holds real data
only (briefing cache included); no fixture points on the public site; the Mission Brief and UNTESTED blocks stay
completely still; choreography and telemetry stay cut.

**Direction:** one experience with three visibly separate layers: **your scenario** (editable inputs, origin clear),
**observed evidence** (verified experiments, conditions, quotations, sources), **research context** (separately
reviewed, outside the matching evidence). Success is a visitor following an observation back to NASA and correctly
explaining a catalog limitation, not more modules.

## Adopted

| # | Decision | Owner |
|---|---|---|
| 1 | **Guided mission as a first-class way in.** The landing gets two weighted choices: primary *"Start the guided mission"* (only once a reviewed case exists), secondary *"Explore the evidence"* (the console, no tour). Before readiness, show the availability line and keep exploration usable. Five steps with a short task each, a text label ("Step 3 of 5"), Back / Next / Explore freely; progress dots only as extra navigation with accessible names; captions beside the relevant section, not a covering modal. Leaving the guide keeps confirmed inputs. Presenter-led preset stays the fallback. | B; A gate + copy; R1/R3 content in the event window |
| 2 | **Current-investigation summary.** *Your scenario* (material · form, Edit), *Conditions* (O₂ · flow, or "not specified"), *Evidence* (eligible · plotted · missing plot coordinates; top matches labelled separately). No confidence percentage or safety score. Desktop: directly above the map. 390px: a compact wrapped block, not another sticky bar. Reuses the revision-binding contract. | B; A copy |
| 3 | **Environment presets say exactly what they change.** Once R1 signs one: its source, *"Sets oxygen and pressure only."*, the editable values with original units, and optionally *"Oxygen updated · Pressure updated · Other inputs unchanged"*. A Moon-related context applies atmosphere inputs to retrieval only. It never implies lunar-gravity modeling. Proposed atmospheres carry a source-specific label (the exploration preset is now *"Proposed exploration atmosphere (Moon base)"*). | A + R1; B rendering |
| 4 | **The selected experiment anchors the page.** Dot, card and citation reveal the same experiment (existing stable IDs and citation mapping); quote and source location in one consistent disclosure area with a route back. Real ledgered stills on the mission's cards first, a stable image area, a clean text card when absent, *"Campaign context"* when the exact-test association is unproven. Never decorative art in an evidence image slot. | B; R2/R1 media |
| 5 | **Reviewed context after the mission.** A small *"Understand the research"* section labelled *"Research context — not matched evidence."*, grouped by visitor questions (where it happened, what it studied, why it matters), signed entries only, each with its source. Omitted entirely if nothing is signed. Droplet, smoke and gaseous topics never enter the solid picker, match counts, map, Brief or comparisons. | B; A contract; R1 review |
| A–E | **Design sections A–E enter as review criteria** for Coder B's self-review and R3's QA, **not** a mandated rearrangement (tables below). The map stays the main evidence surface; no wide sidebar, module destinations or marketing sections before the task. | B, R3 |

## Deferred

| # | Item | Cut rule |
|---|---|---|
| 6 | **Metadata browsing** (filter loaded verified records by material, campaign, test ID; context in its own list; no new service, embeddings or LLM; labelled as browsing, never a change to matching; Burmese aliases only after the MY gate). | Only after the mission, media and QA. If the small catalog is already easy to navigate, don't add it in the event. It's the **first new idea to drop**. |

**Stays cut (no new names):** generated telemetry, safety scores, 3D chamber, chat bot, audit certification,
comparison animation, plus everything Round 4 #4 and the Round 5 rejected list name.

## Coder A: this patch

- **Copy** (`src/lib/copy.ts`): `landingCta`, `missionAvailability`, `summary` (scenario / conditions / evidence;
  eligible, plotted, missing plot coordinates and top matches as distinct counts), `environmentExplanation`,
  `environmentApplied`, `contextBanner`, `campaignContext`.
- **Contracts:** `evidenceViews()` already exposes every count the strip needs (`eligible`, `plotted`, `not_plotted`,
  `top_k`), so no contract change. The revision binding moved into named helpers, `briefingKey()` and
  `currentBriefing()` in `src/engine/views.ts`, which the console now uses (no behavior change).
- **Gates:** `missionEntry()` / `MISSION_CASE` in `src/engine/mission.ts` (unavailable until a case reviewed by a named
  person and built from currently verified cards exists); `contextSection()` in `src/lib/context-content.ts` (null when
  nothing is signed).
- **Tests:** `tests/round6.test.ts`.

## Coder B queue (ordered; rebase on `main` first)

1. **Mission wiring.** Entry from `missionEntry(catalog)`: while `unavailable`, render `message` visibly (not a tooltip)
   and keep *"Explore the evidence"* working; *"Start the guided mission"* is primary only when `available`. Five steps,
   "Step 3 of 5" text labels, Back / Next / Explore freely, captions beside the relevant console section (not a modal
   over the map). Leaving the guide keeps the confirmed inputs. Demo-guide pattern from Round 5 applies.
2. **Current-investigation summary.** `COPY.summary` labels over `evidenceViews()` counts; desktop above the map, a
   compact wrapped block at 390px. Show the Brief only through `currentBriefing()`, never a stale one.
3. **Stills on mission cards.** Ledgered assets only; a fixed-ratio image area (no layout jump); a clean text card when
   there's no image; `COPY.campaignContext` when the association with that exact test is unproven.
4. **Match Panel field alignment.** Material/form, oxygen, airflow, thickness, pressure, outcome in the same positions
   on every card; units beside values; tabular numerals; long IDs wrap; changing-condition qualifiers (GMT45-T4)
   beside the affected value. No winners or "best material" badges.
5. **Context section.** Render `contextSection()`: nothing when it returns null; otherwise `banner` and the entries,
   each with its source link, in a quieter style that never reuses `[E1]` citation styling.
6. **Self-review with R3** against the tables below at desktop and 390px.

Only after all six: the static two-card comparison view (Round 4 #3). Also: when a signed environment preset is
applied, show `COPY.environmentExplanation` and optionally `COPY.environmentApplied` in the Environments row.

### Review criteria B: separate inputs, observations and interpretation

| Information | Treatment | Avoid |
|---|---|---|
| User inputs | Neutral controls; explicit "Your scenario" label; white scenario marker | Making an input look like a NASA measurement |
| Observed outcomes | Existing outcome colors plus text/symbols | Green/red safe–unsafe coding |
| Selected experiment | Selection outline that keeps its outcome color | Recoloring the observation to show selection |
| Missing measurements | "Not reported" or "Not specified", as appropriate | Zero, invented values or a universal "unknown" badge |
| Catalog gaps / outside range | Existing distinct pattern/symbol and bounded explanation | Hazard gradients or a claim about all NASA research |
| Supported interpretation | Its own labelled static block | Presenting interpretation as direct observation |
| Reviewed context | A separate quieter section with its own sources | Reusing `[E1]` citation styling as if it were matched evidence |

Color always has a text or shape counterpart.

### Review criteria A, C, D, E

- **A, hierarchy** (compare with the approved design; not a mandate): header (catalog status · sources · export) →
  hero with one explanation and the two CTAs → 01 Scenario (material presets, signed environment presets, editable
  conditions, confirm) → 02 Observations (summary, full-width map + legends, selected test details) → 03 Compare and
  inspect (aligned cards, stills, quotes, exact source locations) → 04 Mission Brief (completely still) → 05 Catalog
  gaps (static) → Understand the research (reviewed context only).
- **C, alignment:** the Round 4 field order; a shared field table only if uneven card heights break comparison; no
  causal explanations of differences.
- **D, typography and space:** body size for quotations and limitations, small uppercase mono only for short labels;
  group with spacing and borders before nesting another panel; solid backgrounds behind evidence; at 390px cards
  stack, chips wrap, quotes never scroll sideways; generous touch targets and visible focus on guide and citation
  controls.
- **E, motion:** no spring effects imported; Brief and UNTESTED still for everyone; other motion behind the existing
  preference guard; static selection outlines and reliable focus changes instead of animation.

## Handoffs (unchanged, referenced)

- **R1:** `docs/FACT-CHECK-QUEUE.md`. Start with the **smallest defensible set**, not all 17 context entries: the
  presets the mission needs and the few context entries that answer the section's three questions.
- **R2:** `docs/media-ledger.md` before any still ships (including the 4 practice-build SVS images, Round 5).
- **R3:** the `docs/MY-REVIEW.md` gate (MY ships complete and reviewed, or EN-only). Add these to the test script
  for the three-person usability test (they extend Round 4's list). Can unfamiliar users:
  1. explain the purpose from the opening screen?
  2. complete the investigation without a presenter pointing at every control?
  3. open the original source for a real observation?
  4. distinguish a scenario input, an observed result and an interpretation?
  5. explain a catalog limitation without calling it a safety verdict?
  6. And ask: *"What did IGNIS let you discover that a page of papers didn't?"* (a good answer names retrieval,
     comparison, traceability or visible gaps, not an attractive dashboard).

  Record the step where they hesitate; that's fixed first.
