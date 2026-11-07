# IGNIS — Team Plan v2 (2 coders + optional 3rd · 3 research/testing members)

**NASA Space Apps · "Flame in Freefall" · Remaining build window: ~6 days**

**Status:** the Foundation (old Part 1) is **COMPLETE** — both rounds: scaffold,
schema + RLS, design tokens/primitives/icons, shared types with frozen
contracts (GateResult, CoverageResult, changing-conditions qualifier,
catalog_revision cache keys), LLM adapter + validated API routes,
strengthened claim validation, draft→verify curation workflow, landing page,
art pack, deployment runbook. This plan covers everything AFTER that.
`IGNIS_BUILD_PLAN.md` remains the technical contract (Core Principles win
every conflict) as amended by `docs/DECISIONS-ROUND2.md` — the superseded
copy/motion/ownership decisions there are binding. This file replaces the
previous six-part Team Plan.

The five principles everyone obeys: no prediction ever · every AI claim is a
validated evidence object · deterministic before generative · solid-material
domain purity · honesty beats impressiveness.

---

## The team

| Role | Who | Owns |
|---|---|---|
| **Coder A — Engine & Integration** (team lead) | you | `main`, engine, API logic, deployment, merges |
| **Coder B — Mission Console** | teammate | the public UI |
| **Coder C — Features** *(optional — may not exist)* | teammate | flex feature list (§C) |
| **R1 — Data & Science Research** | teammate | sources + extraction + verification (the catalog) |
| **R2 — Media Research** | teammate | NASA footage, photos, card stills, the pitch video |
| **R3 — Testing & Judge Experience** | teammate | QA, demo direction, captions/copy, Burmese review, submission |

## Git & workflow

- **`main` belongs to Coder A.** Branches: `console` (Coder B), `features`
  (Coder C if present). Research members never touch code — they work through
  `/curate`, shared drives, and docs, and file issues/requests to Coder A.
- PR to main when a task is done; CI green first; Coder A merges in a daily
  evening window; main deploys daily; everyone checks the live URL, not
  localhost.
- Cross-ownership changes (shared types, schema, another branch's files) go
  through Coder A as a request.
- Space Apps compliance: card extraction/verification happens inside the
  event window.

## How work flows

```
R1 finds papers → drafts cards in /curate → verifies → verified catalog in DB
R2 supplies footage/stills → card media + console imagery + video b-roll
Coder A: engine + endpoints → typed results → Coder B renders them
Coder C (if present): feature list on top of A+B's core
R3 tests every build on the live URL, writes demo/captions → feeds fixes back
```

---

## Coder A — Engine & Integration *(you — owns main)*

**Mission:** the brain (the old Evidence Engine part) plus keeping the whole
project merged, deployed and verified.

**Build, in order:**
1. **Matching engine** per BUILD_PLAN §5 on the frozen contracts: material
   alias resolver (two dictionaries, visible "Resolved:" line, never
   guesses), eligibility gates (extend the foundation's `gates.ts` — one
   implementation, no fork), weighted similarity with the agreed zero-range/
   all-null semantics, chips + "Matched N of M", outside-range distinct from
   untested. Unit tests per rule, including the red test that SAME/FLEX can
   never reach solid retrieval.
2. **Gap detection + CoverageResult** (§6): the gap grid, Gap Radar data,
   deterministic UNTESTED/outside-range rendering data — the LLM narrates
   only server-supplied gap IDs.
3. **Endpoint logic**: real parse-scenario and synthesize flows on the
   validated-claims pipeline (typed references checked against cited cards),
   briefing cache keyed by catalog_revision, warmed for the demo scenario;
   extraction prompt with the worked BASS example; the export endpoint
   (JSON + embedded schema README).
4. **Integration duties all week**: daily merges, deploy checks, the live
   RLS/endpoint verification suite, mid-week full-flow checkpoint, final
   acceptance run (a non-coder runs the cabin-wall scenario and explains
   UNTESTED unprompted; the one-sentence hallucination answer holds).

**Done when:** every §5–§7 behavior has a passing test, the demo scenario
returns ≥3 strong matches + one clean gap from the live DB, and main never
has a red day.

## Coder B — Mission Console

**Mission:** the public app per BUILD_PLAN §8.1, built from the foundation's
tokens/primitives — never a freelance aesthetic — with the Round-2 decisions
applied (static Brief/UNTESTED, approved slider caption, catalog-bounded
absence copy).

**Build, in order:**
1. Scenario Builder: presets with explicit material mappings, editable
   parsed chips with the confirmation step, alias-resolution line /
   unresolved-material picker, live sliders (retrieval semantics + approved
   caption).
2. **Evidence Map** — the signature visual: outcome dots, pulsing scenario
   marker, match lines, hatched gap cells, outside-range treatment, hover
   cards; §8.3 motion inventory with its restraint rules (reduced-motion
   guard; nothing in Brief blocks moves).
3. Match Panel: WHY-MATCHED chips, outcome badges, thumbnails (R2's stills),
   provenance links.
4. Mission Brief: OBSERVED / SUPPORTED / UNTESTED rendered statically from
   validated claims, Evidence Chain click-through (chip → quote → provenance
   → source), withheld badge, evidence-only fallback state.
5. Gap Radar panel, provenance strip (visible at mobile widths), export
   button wiring, Guided Demo (Judge Mode) with R3's captions, i18n plumbing
   (`t()`, EN strings; MY merged only when R3 delivers the complete reviewed
   set — partial translation never ships).
6. The live choreography (dots stagger in, hatching last, marker glide,
   cards crossfade) — AFTER everything above works.

**Done when:** the live app matches the approved mockup boards at
1440/1024/390 in both themes of content states, and the
drag→glide→re-match→brief sequence runs clean on the deployed URL.

## Coder C — Features *(optional; every item here has a fallback)*

If Coder C exists, they take — in this order:
1. **Telemetry sparklines + full-curve modal** for cards carrying
   `telemetry` (R1 digitizes 3–5 curves).
2. **Guided Demo auto-play captions** (R3 writes the copy).
3. **Comparison animation** between scenarios.
4. **/curate quality-of-life** for R1: draft list filters, field-quote
   helpers, keyboard flow.
5. **Boundary polyline** ONLY if R1 certifies a comparable measured series
   per DECISIONS-ROUND2 — otherwise it stays cut.

**If Coder C does not exist:** item 1 goes to Coder B on Day 5 if ahead of
schedule; item 2 to Coder B (static captions acceptable); items 3–5 are cut
by default. Nobody absorbs Coder C's list at the cost of their own
done-when.

## R1 — Data & Science Research *(the catalog — the project's credibility)*

**Mission:** the old Catalog + Sources parts combined: find it, extract it,
verify it, defend it.

- **First task:** re-verify the three seed cards against NTRS 20150008962
  and publish them under your name — including the GMT45-T4 changing-flow
  qualifier (ignited 10 cm/s → reduced to 2.2). The public catalog count is
  zero until you do this.
- Source hunting in priority order (the GPT review's source table in
  `reports/` is your starting list): BASS/BASS-II NTRS papers, PSI-25
  dataset, Saffire I–IV reports (NTRS 20170008805, 20210011521), SoFIE/MIST
  papers when obtainable. FLEX links for the roadmap slide only; SAME only
  as `smoke_detection` context.
- Workflow per card: draft in `/curate` (LLM extract or manual) → check
  every value against the source → verbatim quote with original units →
  provenance locators (quote page ≠ figure page) → ambiguity stays null →
  verify under your name. 20-min/card timebox; never force non-ignition
  rows into the outcome enum to inflate the count.
- **Targets (one person, adjusted):** seeds re-verified Day 1 · 15 cards by
  Day 2 · 25 by Day 4 · **30–40 by freeze** (40 is stretch, not required).
- Telemetry: digitize one curve for 3–5 standout cards (WebPlotDigitizer),
  labeled as digitized, with axes/units/method noted.
- Maintain the coverage note for R3: what the demo scenario can safely hit,
  where the one clean gap is.

**Done when:** any sampled card survives line-by-line challenge against its
source by the person whose name is on it.

## R2 — Media Research *(photos, footage, video)*

**Mission:** every real image and the film. Nothing AI-generated ever
appears on evidence surfaces (the art pack covers branding only).

- NASA public-domain pull (images.nasa.gov, NASA Glenn, NASA YouTube):
  BASS flame spheres, Saffire burns, SoFIE; FLEX cool flames for the video
  hook only. Keep a **media ledger**: origin URL, credit, campaign,
  test association (only when verifiable — campaign footage is never
  labeled as a specific test without proof), retrieval date.
- Card stills: frame-grabs at 720px for as many verified cards as possible
  (30+ goal), delivered as `media_url` values through R1's curation pass.
- Console imagery support for Coder B (landing, empty states) from the
  existing art pack — no new generation without checking the asset-prompts
  honesty rules.
- **The pitch video** (BUILD_PLAN §13 script beats): capture the live app
  (≥50% of runtime), b-roll, VO with R3's presenter, edited backup
  recording of the exact demo flow. Rough cut Day 5, final Day 6.
- NASA credits end card; no NASA insignia in our branding; skip
  third-party-music clips.

**Done when:** 30+ cards carry stills, the ledger justifies every asset,
and the final video can win judging even if the live demo dies.

## R3 — Testing & Judge Experience *(QA + the room)*

**Mission:** nothing ships untested, and the judge experience is scripted.

- **Daily QA on the live URL** after each merge window: the full scenario
  flow, mobile 390px / tablet / desktop, keyboard navigation,
  reduced-motion, error/empty/fallback states (provider failure must show
  the evidence-only fallback, never a crash). File issues with
  screenshots + steps; verify fixes.
- **Acceptance keeper:** run the formal checks — RLS behaviors on the live
  site (drafts invisible), rate-limit 429, export file sanity, the §12
  acceptance test — and keep a dated checklist in `docs/QA-LOG.md`.
- **Judge experience:** Guided Demo captions + "how to explore" copy
  (approved scientific wording only — catalog-bounded absence phrasing),
  README judge quick-start, docs (demo-script, pitch + Q&A, references).
- **Demo direction:** pick the demo scenario from R1's coverage note (≥3
  strong matches + exactly one clean gap), run two timed rehearsals before
  freeze, drill the three rehearsed answers (UNTESTED one-liner,
  hallucination sentence, security sentence).
- **Burmese:** draft the MY string set, get native review, deliver complete
  or tell Coder B to ship EN-only.
- **Submission:** filled on the final morning, never the final hour;
  screenshots of everything.

**Done when:** a judge who never meets the team gets the full story from
video + live URL + README, and the QA log shows every acceptance check
dated and passing.

---

## Remaining schedule (~6 days)

| Day | Milestone (end of day) |
|---|---|
| **1** | Coder A: resolver + gates + similarity tested on seeds. Coder B: Scenario Builder + static Evidence Map. R1: seeds re-verified + 5 new cards. R2: source footage pull started, first stills. R3: QA checklist drafted, first pass on live URL. |
| **2** | Engine complete (gaps, coverage, chips). Console: Match Panel + map interactions. **15 verified cards.** R3: captions draft. |
| **3** | **Integration checkpoint:** full live flow — parse → match → synthesize → validated Brief on the deployed URL. Guided Demo wired. 20 cards. First full QA sweep. |
| **4** | Honesty surfaces complete (gap shading, outside-range, provenance, export). Choreography. 25 cards + telemetry curves. R2: all card stills in. Dress rehearsal #0. |
| **5** | Coder C list (or its fallback subset). 30+ cards. Video rough cut. Full QA regression. Demo scenario locked from coverage note. |
| **6** | **Feature freeze (morning).** Video final. Two timed rehearsals. Bug-fix only. Final acceptance run + QA log complete. Submission prepared; submitted next morning with buffer. |

**Cut order when a day slips** (first cut first): boundary polyline →
comparison animation → auto-play captions (static captions stay) →
telemetry modal (sparklines stay) → card target 30→25 → MY ships EN-only →
choreography reduced to slider-glide only. **Never cut:** matching + chips,
Evidence Map, claim validation, UNTESTED/outside-range states, Guided Demo
button, evidence-only fallback, the video.

**Still DO NOT BUILD** (unchanged): prediction/simulator · free chat ·
user PDF upload · droplet domain · 3D flames · accounts · offline/PWA
claims · real-time PSI integration · LLM-generated match explanations.

## Daily rhythm

One 15-minute sync each morning: yesterday's done, today's one goal per
person, blockers → Coder A. Evening merge window closes with main deployed
and R3 notified to test. The failure-modes table (BUILD_PLAN §15) is the
shared troubleshooting reference.
