# IGNIS — 7-Day Team Plan (six parts, six owners)

**NASA Space Apps · "Flame in Freefall" · Build window: 7 days**

This file lives in the repo root next to `IGNIS_BUILD_PLAN.md` and divides the
project into six parts, one per team member. The build plan holds the
technical contracts (schema §4, matching §5, claims validation §7, visual
language §8.3, security §10); this file holds who does what, when, and how the
parts connect. Where the two disagree, `IGNIS_BUILD_PLAN.md` Core Principles
win. The five principles every part obeys: no prediction ever · every AI claim
is a validated evidence object · deterministic before generative · solid-material
domain purity · honesty beats impressiveness.

With 7 days instead of 48 hours, the former SHOULD-HAVE and WOW tiers are now
**committed scope** (§ Expanded Scope below). The DO-NOT-BUILD list is
unchanged — more time is not a reason to build a simulator.

---

## Git & workflow (everyone)

- **`main` belongs to Part 1 (team lead).** Nobody else pushes or merges to
  main — ever. Each part works on its own branch (`part2-engine`,
  `part3-console`, …), small commits, PR to main when a task is done.
- Part 1 merges in a **daily merge window** (evening). CI (typecheck, tests,
  build) must be green before a PR is opened.
- Cross-part changes (another part's files, shared types, schema) go through
  Part 1 as a request, never edited directly.
- The deployed preview updates from main daily — everyone checks their work
  on the real URL, not just localhost.
- Space Apps compliance: source lists and this plan are prep; code and card
  extraction/verification happen during the event window as the rules require.

## The interfaces (what each part hands the others)

```
Part 5 (sources) → raw papers/links → Part 4 (verifies) → verified cards in DB
Part 1 (foundation: schema, tokens, adapter, endpoints) → everyone builds on it
Part 2 (engine) → typed match/claims results → Part 3 (renders them)
Part 3 (console) → the working app → Part 6 (films, scripts, captions it)
Part 6 → captions/translations/demo scenario choice → back into Parts 3 & 1
```

Shared TypeScript types live in `src/lib/types.ts`, owned by Part 1; Parts 2
and 3 code against them from day one.

---

## Part 1 — Foundation & Integration *(team lead — owns `main`)*

**Mission:** everything the other five build on, plus keeping the whole thing
merged, deployed and verified all week.

**Build (Days 1–2):**
- Repo scaffold: Vite + React 18 + TS strict + Tailwind; ESLint; Vitest; CI
  (typecheck, test, build) on every PR.
- Supabase project + the full migration from BUILD_PLAN §4 **with RLS from
  §10** (public reads only where `verified_by is not null`; all writes
  server-side).
- Design foundation per §8.3: `tokens.css` (colors, type, motion durations,
  reduced-motion guard), the icon set, and shared UI primitives (Button,
  Chip, Panel, Select) so Parts 2–3 never invent their own.
- `llm.ts` provider adapter (Groq primary → Gemini failover, env-ordered,
  identical prompts + Zod both sides) and the serverless endpoints
  `/api/parse-scenario`, `/api/synthesize`, `/api/extract`,
  `/api/curate-write` — stubs with Zod schemas and the claim-validation
  pipeline wired (§7.4–7.5), real logic filled by Part 2.
- `/curate` page skeleton (manual form first) + 3 hand-seeded cards from one
  BASS paper, so Parts 2–4 are unblocked immediately.
- Vercel deploy green with env vars (service-role key, LLM keys,
  curator secret — server-side only) on Day 1.

**All week:** daily merge window; resolving cross-part requests; keeping main
always deployable; the Day-3 and Day-4 integration checkpoints; final
acceptance run on Day 6 (the §12 acceptance test + the one-sentence
hallucination answer).

**Done when:** every other part built on the foundation without forking it,
main deployed daily without a red day, and the final app passes the
acceptance checks.

## Part 2 — The Evidence Engine *(the brain)*

**Mission:** every deterministic and AI-boundary mechanism, exactly per
BUILD_PLAN §5–§7.

- Material alias resolver (two dictionaries, never merged; visible
  "Resolved:" output; never silently guesses).
- Matching: gates → weighted similarity → chips → "Matched N of M";
  outside-catalog-range as a distinct state from untested; score never shown.
- Gap grid + Evidence Gap Radar data (top contiguous untested regions,
  under-covered materials).
- Real logic inside the endpoint stubs: parse-scenario, synthesize with
  structured claims + evidence-ID validation + retry-at-0.1 + withheld
  counting; extraction prompt for `/curate`.
- Export endpoint (clean JSON + embedded schema README).
- **7-day additions:** briefing cache warm for demo scenarios; per-IP rate
  limiting; the flammability boundary polyline data (through actual data
  points only, never beyond catalog extent); unit tests for every §5 rule and
  a red test proving SAME/FLEX can never enter solid retrieval.

**Done when:** a judge asks "how do you stop hallucination?" and the answer is
one sentence backed by a passing test suite.

## Part 3 — The Mission Console *(what judges see)*

**Mission:** the public app, built to the §8.3 tokens and the approved
mockup boards — never a freelance aesthetic.

- All §8.1 sections in order: provenance strip, Scenario Builder (presets +
  editable chips + live sliders with retrieval semantics + the no-prediction
  caption), Evidence Map (outcome dots, pulsing marker, match lines, hatched
  gap cells, outside-range treatment), Match Panel with WHY-MATCHED chips,
  Mission Brief with Evidence Chain click-through + withheld badge,
  Gap Radar, Export button, Guided Demo button.
- The §8.3 motion inventory with its restraint rules (nothing faster than
  1.2s; zero animation in Brief/UNTESTED blocks; reduced-motion guard) and
  the live choreography (dots stagger in, hatching draws last, marker glides
  on drag, briefing types in with chips popping on validation).
- **7-day additions (now committed):** telemetry sparklines + full-curve
  modal on cards that have `telemetry`; comparison animation when switching
  scenarios; boundary polyline rendering; a polished landing/hero section
  per the Landing mockup board; i18n plumbing (`t()` helper, EN source
  strings, MY wired in from Part 6) with an `EN | မြန်မာ` toggle; the
  read-only resilience cache (performance fallback only — never pitched as
  offline readiness).

**Done when:** the live app is indistinguishable from the mockup boards, at
1440/1024/390 widths, and the drag→glide→re-match→retype sequence runs
smoothly as the demo climax.

## Part 4 — The Evidence Catalog *(the science)*

**Mission:** chief curator — the project's credibility lives here.

- Verify every card against its source: verbatim quote with original units,
  normalized SI values, provenance (page/figure/table, NTRS id, DOI only if
  real), ambiguity → null + note, never a guess. `verified_by` carries your
  name — own it in Q&A.
- **7-day targets:** 15 verified cards by end of Day 2 (minimum demo), 30 by
  Day 3, **45–60 by Day 5** across BASS/BASS-II, Saffire I–IV, SoFIE/MIST
  (SAME only as `smoke_detection` context cards). 20-min/card timebox;
  thin verified beats rich unverified.
- **Telemetry (committed now):** digitize one curve each for 6–8 standout
  cards with WebPlotDigitizer, stored per the schema's `telemetry` shape.
- Maintain the catalog-coverage note for Part 6 (what the demo scenario can
  safely hit; where the one clean gap is).

**Done when:** any sampled card's numbers can be defended line-by-line against
its source by the person whose name is on it.

## Part 5 — Source Intelligence & Media *(the hunt)*

**Mission:** raw material in, imagery in — nobody upstream ever waits.

- Day 1: the source pack — specific NTRS papers (ids + links + which contain
  results tables), PSI investigation pages as provenance anchors, ordered by
  extraction value. FLEX/droplet links collected for the roadmap slide only.
- Feed the extraction queue continuously; do card data entry in `/curate`
  (Part 4 verifies); flag hard papers instead of sinking time.
- Media: pull NASA public-domain footage and stills (BASS flame spheres,
  Saffire burns; FLEX cool flames for the video hook only) from
  images.nasa.gov and NASA Glenn; produce `media_url` thumbnails for as many
  cards as possible; supply Part 3's landing imagery and Part 6's b-roll.
  No NASA insignia in our branding; skip clips with third-party music.

**Done when:** Part 4 never idles waiting for material, 30+ cards carry
thumbnails, and Part 6 has a full b-roll library by Day 5.

## Part 6 — Broadcast & Judge Experience *(the room)*

**Mission:** everything a judge experiences outside the raw app.

- The 2.5-minute pitch video per BUILD_PLAN §13: script, VO, capture, edit —
  product UI ≥50% of runtime; backup recording of the identical live flow.
- Demo direction: pick the demo scenario FROM the finished catalog (≥3 strong
  matches + exactly one clean gap, per Part 4's coverage note); run two timed
  rehearsals before freeze; drill the three rehearsed answers (UNTESTED
  one-liner, hallucination sentence, security sentence).
- Guided Demo (Judge Mode) copy: step captions **(auto-play captions now
  committed)** and the "how to explore" text.
- **7-day additions:** draft the Burmese translation set for Part 3's i18n
  (native-review before merge; partial translation never ships — EN-only
  with clean structure if short), README judge quick-start, docs
  (demo-script, pitch + Q&A, references with licenses), and the submission
  form filled on **Day 7 morning, not the final hour**.

**Done when:** a judge who never meets the team — video, live URL, README —
gets the full story unassisted.

---

## Expanded Scope (7-day window)

**Promoted to committed** (formerly SHOULD/WOW): live sliders with real-time
re-retrieval · gap-grid shading · Gap Radar panel · media thumbnails · 45+
cards · briefing cache · provenance on most cards · Guided Demo with
auto-play captions · telemetry sparklines/modal (6–8 cards) · comparison
animation · boundary polyline (data extent only) · bilingual EN/MY ·
resilience cache (performance only) · polished landing section.

**Stretch (only if Day 5 ends on schedule):** Experiment Replay panel for 2–3
flagship cards — NASA footage clip beside the card's structured conditions
with observation captions (no invented timestamps) · print/PDF export of a
briefing (claims + citations + provenance, for the "mission paperwork" feel).

**Still DO NOT BUILD** (unchanged from BUILD_PLAN §11): prediction/simulator
of any kind · free chat over the corpus · user PDF upload · droplet domain ·
3D flame graphics · accounts beyond the curator secret · offline/PWA claims ·
real-time PSI integration · LLM-generated match explanations.

## 7-Day Timeline

| Day | Milestone (end of day) |
|---|---|
| **1** | Foundation on main: scaffold, DB+RLS, tokens/primitives, adapter+endpoint stubs, `/curate` skeleton, 3 seed cards, deploy green. Source pack delivered. All branches created. |
| **2** | Engine core (resolver, gates, similarity, chips) tested on seeds. Console static sections (builder, map, match panel) in tokens. **15 verified cards.** |
| **3** | AI layer live end-to-end (parse → match → synthesize → validated claims → Brief UI). **Integration checkpoint #1:** full flow on the deployed URL. 30 cards. |
| **4** | Honesty layer complete (gap shading, outside-range, provenance strip, export). Motion inventory + choreography. **Mid-week full demo run** — treat as dress rehearsal #0. |
| **5** | Expanded features: telemetry modals, boundary polyline, comparison animation, bilingual toggle, Guided Demo captions, landing polish, resilience cache. **45+ cards.** Video shooting starts. Stretch items only if everything above is done. |
| **6** | **Feature freeze (evening).** Video edit complete. Two timed rehearsals. Bug-fix only. Final acceptance run by Part 1. |
| **7** | Buffer: deployed-URL smoke test on fresh devices, Q&A drill, submission completed in the morning, team sanity margin for the afternoon. |

**Cut order if a day slips** (first cut first): Experiment Replay → PDF export
→ comparison animation → boundary polyline → telemetry count drops to 3 →
bilingual ships EN-only with structure → card target drops to 30. Never cut:
matching+chips, Evidence Map, claim validation, UNTESTED/outside-range
states, Guided Demo button, the video.

## Daily rhythm

One 15-minute sync at the start of each day: yesterday's done, today's one
goal per part, blockers → Part 1. The merge window closes each evening with
main deployed. The failure-mode table (BUILD_PLAN §15) is the shared
troubleshooting reference — check it before improvising a fix.
