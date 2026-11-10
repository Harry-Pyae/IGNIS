# IGNIS — Milestones

**NASA Space Apps 2026 · "Flame in Freefall" · Team AstroFlare**
This is one self-contained file for checking progress without the repo. Coder A updates it after every patch.

| | |
|---|---|
| **As of** | 2026-11-10, preparation phase (4 days before the official start, Sat 2026-11-14 = Day 1) |
| **main** | `21bb12c` + this docs patch (65 commits since 2026-11-07) |
| **Live** | <https://ignisprototype01.vercel.app>, serving `21bb12c` (console code-split) |
| **CI** | green: typecheck · lint · 186 tests passed, 17 skipped (DB tests, which run in their own CI job) · build · disposable-DB job |
| **Public catalog** | **0 verified cards**, 3 drafts in review |
| **Overall** | Engine, API and console are built and live. **Compliance:** the official FAQ bars working on the challenge before the event; we disclosed our pre-event work ([DISCLOSURE.md](DISCLOSURE.md)) and the organizers' ruling (reported 2026-11-10) lets preparation continue. Then data: nothing real can be demoed until R1 publishes verified cards, and that happens in the event window. |

**Card verification happens only in the event window (from Sat 2026-11-14).** The guide is [§12](#12-how-to-verify-a-card-r1-curate).

Legend: ✅ done · 🟡 partly done · ❌ not started · ⛔ blocked (named dependency) · ❓ not visible in the repo (ask the owner)

---

## 1. What IGNIS is

Describe a spacecraft fire scenario in mission terms. IGNIS retrieves NASA's closest real microgravity combustion
experiments, shows what was actually observed, and makes the absence of evidence visible. **The one idea:** IGNIS
refuses to guess.

**The five Core Principles** (they win every conflict):
1. **No prediction, ever.** It only reports what NASA observed; "predict" is banned from copy, code and pitch.
2. **Every AI claim is a validated evidence object.** The server checks every claim, and claims that fail are withheld visibly.
3. **Deterministic before generative.** Retrieval, matching, ranking, coverage, gaps and alias resolution are pure code; the LLM only parses and narrates.
4. **Scientific domain purity.** Solid flammability only (BASS, BASS-II, Saffire, SoFIE/MIST); SAME is `smoke_detection`; FLEX is never carded.
5. **Honesty beats impressiveness.** Missing data stays null and visible; "untested" and "outside catalog range" are distinct states.

**Stack:** Vite + React 18 + TypeScript (strict) + Tailwind v4 · Supabase (Postgres + RLS) · Vercel serverless functions
(US East `iad1`) · Groq `openai/gpt-oss-120b` primary, Gemini `gemini-3.5-flash-lite` backup · Zod on every LLM response · Vitest.

## 2. Team and ownership

| Role | Owns | Status |
|---|---|---|
| **Coder A** (team lead) | `main`, engine, API, deploy, merges, shared contracts/copy | Active; queue empty until the next console PR or R1's cards |
| **Coder B** | Mission console (`console` branch) | Console v1 merged and live 2026-11-10 |
| **Coder C** (optional) | Features (`features` branch) | ❌ no commits beyond `main`; the Team Plan's fallback rules apply |
| **R1** | Data and science research: the catalog | ⛔ 0 cards published (blocks the demo) |
| **R2** | NASA media, media ledger, pitch video | ❓ no ledger in the repo yet |
| **R3** | QA, demo, captions, Burmese review, submission | ❓ no QA log or demo script in the repo yet |

Rules: only Coder A merges to `main`; CI green before every PR; production holds real data only; publication is a named
human (`verified_by` is the reviewer's own name).

## 3. Preparation-phase milestones (2026-11-07 → 11-13, before the official start)

| Date | Milestone | Key commits |
|---|---|---|
| 2026-11-07 | **Foundation round 1:** scaffold, schema + RLS, design tokens/primitives/icons, shared Zod contracts, Groq/Gemini adapter, claim-validation pipeline, `/curate` form + LLM extract, app shell + landing, art pack, CI, Vercel config | `cf24fa5` → `7adea6a` |
| 2026-11-07 | **Foundation round 2:** contracts frozen; publication = a named human (drafts, placeholder names rejected in API + DB); claims validated against the cited card; server-side eligibility gates + deterministic coverage; clean-draft extraction; motion guard (Brief/UNTESTED static); disposable local DB + RLS/lifecycle tests; Node 24; Decisions round 2 | `ef93bba` → `2867ff0` |
| 2026-11-07 | **Team Plan v2** replaces the six-part plan (Coder A/B/C + R1–R3) | `5434323`, `06cd3f8` |
| 2026-11-08 | **Engine patch 2:** briefing cache, export endpoint, worked BASS extraction example, LLM observability, `/api/health-llm` | `3c50a80` (#2) |
| 2026-11-09 | **Matching engine:** alias resolver, gates → weighted similarity → chips, gap grid + Gap Radar | `2ecd266` (#4) |
| 2026-11-09 | OG/canonical URLs (#5); health probe with real generation (llm-models); **rate limit** with a shared Postgres counter that fails open (#6, migration 0003) | `68af561`, `dcb304a`, `2d07075` |
| 2026-11-09 | **Round 3:** verified-catalog loader, one consistent catalog snapshot (synthesize/export/browser), curation race fix, export wiring, Decisions round 3 | `e3267a0` (#8) |
| 2026-11-09 | Production-data rule; Gemini probe rule (lite-only, one call); **curator-only provider switch** for failover rehearsal; parse failover proven on production | `55589a8`, `c2ea33b`, `de36ffd` (#12), `e4e0cba` |
| 2026-11-09 | **Canonical airflow rule:** "still air" → 0, no mention → null, one prompt for both providers | `3e9efff` (#14) |
| 2026-11-10 | **Mission console merged** (Coder B): scenario builder, Evidence Map, Match Panel, Mission Brief, Gap Radar, `t()` i18n. Two review rounds sent back 7 issues; all fixed. | `298c802` |
| 2026-11-10 | **Match summary names every uncounted parameter** (decision 10) | `c7703e7` |
| 2026-11-10 | **Lite is the permanent Gemini backup** (code default); functions pinned to `iad1`; local-dev Groq note; decisions 9–11 | `a053e14` |
| 2026-11-10 | STATE handoff; console verified live | `e12c4e6` |
| 2026-11-10 | MILESTONES.md published; card-verification guide (§12); PageSpeed re-run after the console | `12c3b43`, `3d257b0` |
| 2026-11-10 | **Timeline re-baselined** to the official start; FAQ conflict found; DISCLOSURE.md; Decisions Round 4 (upgrade proposal), build items on hold | `5085371` |
| 2026-11-10 | **Organizer ruling** (reported): preparation may continue; build hold lifted | this patch |
| 2026-11-10 | **Console code-split:** landing JS 95.6 → 57.2 KB gzip, Zod off the landing path, console prefetched at idle and mounted near the viewport, console deep links fixed; recharts removed | `21bb12c` |

## 4. Scope checklist (Build Plan §11 tiers, as amended by the Team Plan)

### MUST HAVE (the demo dies without these)

| Item | Status | Notes |
|---|---|---|
| 15+ verified cards | ⛔ **0** | R1. 3 seed drafts are waiting for re-verification against NTRS 20150008962 |
| Scenario Builder with presets + editable fields | ✅ | 4 presets; 2 (Cable insulation, Cargo packaging) open the material picker until R1 cards those materials |
| parse-scenario with user confirmation | ✅ | Values are editable; nothing is retrieved before Confirm |
| Deterministic alias resolution + visible "Resolved" line | ✅ | Unknown or ambiguous phrases open a picker of verified materials only |
| Matching: gates + chips + "why this matched" | ✅ | Summary: "Compared on N of 4 parameters · reasons" |
| Evidence Map: outcome dots, scenario marker, match lines | ✅ | Plus hatched untested cells, dashed outside-range cells, clipping to the axes |
| Mission Brief from validated claims + Evidence Chain | ✅ | Citation chip → card → quote → page/figure/table → NASA PDF |
| UNTESTED and outside-range as distinct states | ✅ | In chips, map, legend and Brief |
| Provenance on every card | ✅ | Page · figure · table · NTRS link |
| Export Dataset | ✅ | Header + footer; an honest README-only file while the catalog is empty |
| RLS + server-side secrets | ✅ | Anon sees verified rows only; only the two public Supabase values reach the browser |
| Deployed public URL | ✅ | |

### SHOULD HAVE

| Item | Status | Notes |
|---|---|---|
| Live sliders with re-retrieval | ✅ | O₂ and airflow, each with a "Not specified" state |
| Gap-grid shading on the map | ✅ | |
| Gap Radar panel | ✅ | Largest untested regions + materials with < 3 records |
| Media thumbnails on cards | ❌ | Needs R2's stills (`media_url`); the console doesn't render them yet |
| 30 cards | ⛔ | R1 |
| Briefing cache | ✅ | Keyed by scenario + `catalog_revision` + prompt/validator version |
| Guided Demo (Judge Mode) | 🟡 | Panel and button exist but are **disabled** until cards are live; captions from R3 pending |

### WOW (if time allows)

| Item | Status |
|---|---|
| Auto-play Guided Demo captions | ❌ (Coder C item 2, falls back to Coder B static captions) |
| Telemetry sparklines/modal | ❌ (field exists in `/curate`; R1 digitizes 3–5 curves) |
| Comparison animation | ❌ (cut by default without Coder C) |
| Flammability boundary polyline | ⛔ deferred (decision R2-6: needs a certified comparable measured series) |
| Burmese UI | 🟡 `t()` plumbing + EN set done; ships only with R3's complete reviewed set |
| Map choreography (dot stagger, marker glide, crossfade) | ❌ (Coder B item 6, after everything else) |

### DO NOT BUILD (unchanged)
Prediction/simulator · free chat · user PDF upload · droplet domain · 3D flames · accounts · offline/PWA claims ·
real-time PSI integration · LLM-generated match explanations.

## 5. Event-window plan

**Official event: Saturday 2026-11-14 (Day 1) → Sunday 2026-11-15 (Day 2).** Everything before that is the
preparation phase. The Team Plan's old Day 1–6 schedule (counted from 2026-11-08) is replaced by this table.
Submission follows the local event's end time; aim for Day 2 morning, never the final hour.

| When | Work | Owner | Status |
|---|---|---|---|
| **Prep: done** (11-07 → 11-10) | Engine, API, curation tool, console, tests, deploy | Coder A, Coder B | ✅ Disclosed in DISCLOSURE.md |
| **Prep: now** (11-10 → 11-13) | Ruling received (reported 2026-11-10): attach its written text to DISCLOSURE.md; choose a project license; fill in the art-pack tool | Coder A | 🟡 |
| **Prep: allowed** | R1 source *list* only (Build Plan §9, no extraction); R2 identifying footage sources; R3 QA-checklist template | R1, R2, R3 | open |
| **Prep: build** | ✅ console lazy-loading (`21bb12c`, Round 4 #5) · then mission wiring, stills rendering, Match Panel field alignment (Coder B, after rebasing on `main`) | Coder B, Coder A review | 🟡 |
| **Fri 11-13** | Space Apps publishes the Project Submission + Judging guides; R3 reads them and confirms the submission format | R3 | pending |
| **Day 1 (Sat 11-14)** | **R1 card-verification sprint:** re-verify the 3 seeds from the source, then 15+ cards (§12) | R1 (+ team lead session) | pending |
| Day 1 | **Integration checkpoint on real cards:** warm the demo cache, parse → confirm → retrieve → synthesize → cite on the deployed URL; the **forced-Gemini synthesize proof** (once, on a real card) | Coder A | pending (needs cards) |
| Day 1 | Mission case chosen from the real catalog (≥3 strong matches + one clean gap); captions written | R1 + R3 | pending (needs cards) |
| Day 1 | Stills association checked for the mission's cards; footage pull | R2 → R1 | pending |
| **Day 2 (Sun 11-15)** | Mission content wired (or the presenter-led fallback); aligned Match Panel; static comparison only if time allows | Coder B | pending |
| Day 2 | Three-person usability test (DECISIONS-ROUND4, five questions); fix the hesitation step | R3 | pending |
| Day 2 | QA sweep at 390/1024/1440 + reduced motion; acceptance run; two timed rehearsals; final video | R3, Coder A, R2 | pending |
| Day 2 | **Submission** with credits, licenses and the AI-use description | R3 + Coder A | pending |

**Cut order inside the window** (first cut first): static comparison view → stills beyond the mission's cards →
Burmese (ships EN-only) → mission wiring (falls back to the presenter-led preset). Choreography, telemetry and the
comparison animation stay cut.
**Never cut:** matching + chips, Evidence Map, claim validation, UNTESTED/outside-range, the evidence-only fallback,
real verified cards, the video.

## 6. "Done when" per role

| Role | Done when (Team Plan) | Status |
|---|---|---|
| Coder A | Every §5–§7 behavior has a passing test; the demo scenario returns ≥3 strong matches + one clean gap from the live DB; `main` never has a red day | 🟡 Tests ✅, main green ✅; the demo scenario ⛔ needs cards |
| Coder B | Live app matches the mockup boards at 1440/1024/390; drag → glide → re-match → Brief runs clean on the deployed URL | 🟡 Console v1 live; choreography, thumbnails and Guided Demo open |
| Coder C | Its list or its fallback subset | ❌ not started |
| R1 | Any sampled card survives a line-by-line challenge against its source | ⛔ 0 cards |
| R2 | 30+ cards carry stills; ledger justifies every asset; the video can win alone | ❓ |
| R3 | A judge gets the full story from video + URL + README; QA log has every check dated and passing | ❓ |

## 7. Verification scoreboard

| Check | Result |
|---|---|
| Console against the production catalog | ✅ 2026-11-10, 1280 px + 390 px: honest empty states everywhere before and after Confirm, no fixture dots, no `/api` calls, no errors, no sideways scroll |
| Console click-through (disposable DB, Edge) | ✅ 2026-11-10: presets, free text, material picker, both "Not specified" sliders, Set/Clear, keyboard, three map states, clipping, still Brief, reduced motion, 390 px |
| Synthesize round trip | ✅ round 3 via Groq (0 withheld, revision bound, cache hit) |
| Synthesize on Gemini lite | ✅ locally (2 validated Briefs); production proof ⛔ waits for R1's first card |
| Forced-Gemini parse on production | ✅ 2026-11-09 |
| health-llm | ✅ 2026-11-10: Groq 200, Gemini 200. Flash checks have ended (lite is final) |
| RLS + curation lifecycle | ✅ 15/15 on the disposable DB in CI on every push |
| Rate limit | ✅ 20 allowed, then 429 with `retry-after`; fails open |
| Export | ✅ empty-catalog file with the 33-field README |
| PageSpeed mobile | ✅ 2026-11-10 after the console code-split (`21bb12c`), Lighthouse 12.2 mobile with devtools throttling from the dev machine (the Google API's keyless quota was exhausted both times): **Performance 83** (79 before the split) · Accessibility / Best Practices / SEO 100 · FCP/LCP **3.5 s** (4.0) · TBT 40 ms · CLS 0.001 · unused JS at first load **0** (42 KiB). Landing JS **57.2 KB gzip** (95.6 before the split, 55.3 before the console), and Zod is off the landing path again. The absolute times are network-bound on this path (200 ms RTT, 560 ms for the HTML), so they aren't comparable with the old Google-server run (FCP 0.8 s). Re-run from Google's servers when the quota resets. |
| Favicon tab screenshot | ❓ R3 |

## 8. Decisions log (summary)

**Round 2 (2026-11-07):** (1) the Team Plan supersedes Build Plan §9/11/12/14 · (2) the Brief and UNTESTED blocks are always still · (3) one slider caption ·
(4) absence copy: "No matching verified evidence in the current IGNIS catalog." · (5) ownership table · (6) boundary polyline deferred · (7) Node 24.

**Round 3 (2026-11-09 → 11-10):** (1) catalog-bounded copy everywhere · (2) the pitch line "IGNIS never predicts" is kept · (3) review wireframes are input for Coder B ·
(4) estimates are planning aids · (5) R1's source order: seeds → BASS-II → Saffire I/II/IV → MIST · (6) a correctly associated still beats thumbnail count ·
(7) async Brief + revision-binding contract · (8) canonical airflow parsing (still air = 0, unmentioned = null) ·
(9) shared-primitive changes need Coder A sign-off · (10) match summary names every uncounted parameter ·
(11) Gemini lite is the permanent backup; Groq blocks the team's network, so local dev always runs on Gemini; production runs in `iad1`.

**Round 4 (2026-11-10, upgrade proposal):** (1) Guided Demo → five-step evidence-investigation mission; content only from R1's verified cards · (2) ledgered stills on cards; the map stays a pure plot · (3) align Match Panel fields first, static comparison only if time allows · (4) rejected: trainers, survival guides, games, health tools, boundary fits, danger heatmaps, safety rankings, new report formats, new artwork · (5) lazy-loading before any mission code · (6) schedule re-baselined to 2026-11-14 = Day 1 · (7) the proposal stays uncommitted. **All build items are on hold pending the organizer ruling.**

## 9. Open risks and blockers

| Risk | Impact | Next step |
|---|---|---|
| **Pre-event work vs the FAQ rule** | Ruling reported 2026-11-10: preparation may continue | Coder A: attach the written ruling to DISCLOSURE.md; keep the disclosure and AI-use section in the submission |
| **No verified cards** | Blocks the demo case, the integration checkpoint, the mission, stills, the production failover proof and the acceptance run | R1: verification sprint on Day 1 (in the event window only) |
| No R2/R3 artifacts in the repo | Can't confirm the video, ledger, QA log or demo script are on track | R2/R3: send docs-only PRs or issues to Coder A |
| Forced-Gemini synthesize unproven on production | Backup path on stage is proven in tests and locally only | Coder A: run once on R1's first real card (runbook §3) |
| Two presets lack materials | Cable insulation and Cargo packaging always open the picker | R1: card a real insulation and a packaging material, send the `fuel_material` names |
| Coder C absent | WOW features cut by default | Follow the fallback rules; nobody absorbs them at the cost of their own "done when" |

## 10. Next actions

| Owner | Action |
|---|---|
| Coder A | Attach the written ruling; choose the project license; fill in the art-pack tool name. On Day 1: warm the demo cache, the full checkpoint on real cards, the forced-Gemini synthesize proof, the acceptance run |
| R1 | No card extraction or verification before Sat 11-14. Day 1: re-verify and publish the 3 seeds under your own name, decide GMT45-T4, then 15+ cards; coverage note for R3 |
| R2 | Day 1: stills with a rights ledger for the mission's cards; video by Day 2 |
| R3 | Fri 11-13: read the Submission + Judging guides. Day 1–2: captions, usability test, QA, rehearsals, submission |
| Coder B | Rebase `console` on `main` (the console now lives in `src/pages/Console.tsx`), then mission wiring, stills and field alignment |

## 11. Codebase at a glance

| Area | Where | Size |
|---|---|---|
| API routes (Vercel functions) | `api/`: parse-scenario, synthesize, extract, curate-write, curate-cards, export, health-llm | 7 routes |
| Server logic | `src/server/`: LLM adapter, prompts, claim validation, synthesis, briefing cache, rate limit, export | |
| Engine (pure, no LLM) | `src/engine/`: aliases, match, gaps, views · `src/lib/gates.ts`, `coverage.ts` | |
| Contracts | `src/lib/types.ts` (Zod), `copy.ts` (approved copy), `fixtures.ts` | |
| UI | `src/pages/Home.tsx` (landing), `Console.tsx` (lazy console) + `consoleLoader.ts`, `Curate.tsx`, `Kit.tsx` · `src/components/ui/*` · `src/i18n/` | |
| Database | `supabase/migrations/` 0001–0003 · `supabase/seed.sql` (3 drafts) | |
| Tests | `tests/`: 25 files; `tests/db/` RLS + lifecycle on a throwaway DB | 186 passing |
| Docs | `IGNIS_BUILD_PLAN.md`, `IGNIS_TEAM_PLAN.md`, `AGENTS.md`, `docs/STATE.md`, `DECISIONS-ROUND2/3/4.md`, `DISCLOSURE.md`, `DEPLOY-RUNBOOK.md` | |

Total tracked source + tests + DB + scripts: ~9,300 lines.

## 12. How to verify a card (R1, `/curate`)

One page for the Day 1 verification sprint. **Card extraction and verification happen only inside the event window
(2026-11-14 → 11-15).** The rules come from Build Plan §4/§9, Team Plan R1, DECISIONS-ROUND2 and the
`/curate` form itself. Publishing on production is allowed **only** for real cards checked against their source,
under the reviewer's own name.

**Before you start**
- Open `https://ignisprototype01.vercel.app/curate` and enter the curator secret. Coder A shares it privately; never
  paste it into chat, docs or screenshots.
- Have the source PDF open. The three seeds come from NTRS 20150008962 (Zhao, T'ien, Ferkul, Olson, 2015, "Concurrent
  flame growth, spread and extinction over composite fabric samples…").
- Timebox: **20 minutes per card**. If a card can't be defended in that time, leave it as a draft with a note.

**Steps**
1. **Open the card.** For a seed: **Cards · drafts and published** → *Reopen*. For a new card: *New card*, or paste an
   excerpt and press *Extract into a new draft*. The extractor is only a helper: the server discards any value without
   a supporting quote that appears in the excerpt (listed under "Discarded by the server").
2. **Check every non-null field against the source**, line by line. The fields marked `*` are required: domain, campaign,
   test_id, fuel_material, material_class, fuel_form, outcome, key_observation_quote, source_title, source_url.
3. **Apply the field rules:**

| Field | Rule |
|---|---|
| Any value | Only what the source **explicitly states**. Ambiguous → leave it empty (null) and explain in `notes`. Never estimate, never fill provenance from memory. |
| `domain` | `solid_flammability`. SAME experiments are `smoke_detection`. FLEX (droplets) is never carded. |
| `fuel_material` / `material_class` | Normalized name (e.g. `PMMA`, `cotton_fiberglass`, `nomex`); class is one of thermoplastic · fabric · aramid_fabric · insulation · other. |
| `fuel_form` | flat_sheet · rod · fabric · thick_slab |
| Numbers | Normalized units: `thickness_mm`, `o2_pct` (volume %), `flow_cm_s`, `pressure_kpa` (1 atm = 101.325 kPa), `spread_rate_mm_s`. The original units stay in the verbatim quote. A value that is only plotted (e.g. read off a figure) is not "stated": leave it null. |
| `outcome` | sustained · extinguished · transition · partial. Never force a non-ignition row into these to raise the card count. |
| `key_observation_quote` | Verbatim from the source, with original units. |
| Changing conditions | Use `condition_changes`, e.g. `[{"parameter":"flow_cm_s","from":10,"to":2.2,"stored":"final_held","note":"… (p.5)"}]`. Never store a changing condition as if it were constant. |
| Provenance | `source_page`, `source_figure`, `source_table`, `source_section`, `ntrs_id`. The quote's page and the figure's page often differ; record each where it really is. |
| `media_url` | Only a still from R2's media ledger. Leave empty otherwise. |

4. **Publish.** Type your **own full name** in *Verified by (your full name)* and press *Verify & publish*. Publishing
   means you checked every non-null field against the source yourself. Role names ("R1", "Coder A") and placeholder
   words (test, example, TBD, unknown…) are rejected by both the server and the database.
5. **Never publish for someone else.** If you can't verify it yourself, press *Save draft* and hand it over.
6. **Corrections.** Reopen a published card, fix it and save. Saving un-publishes it until someone re-verifies it. The
   catalog revision changes, so cached briefings for the old version are dropped automatically.
7. **Check it went public.** The live console header count goes up, and the card appears on the Evidence Map / in the
   Match Panel for a matching scenario.

**Verification sprint agenda (Day 1, Sat 2026-11-14)**
- [ ] Re-verify and publish the 3 seed cards (BASS GMT96-T7, BASS GMT96-T8, BASS-II GMT45-T4).
- [ ] Decide GMT45-T4: card it with the held flow (2.2 cm/s) plus its `condition_changes` qualifier (current choice), or keep it out of constant-flow comparisons (DECISIONS-ROUND2).
- [ ] Next sources in order: complete BASS-II runs → Saffire I/II/IV → obtainable MIST papers (DECISIONS-ROUND3 #5).
- [ ] When a real wire/cable insulation card or cargo packaging card is published, send Coder A its exact `fuel_material` (this activates two presets).
- [ ] Tell Coder A when the seeds are live: that starts the integration checkpoint (demo cache, full flow on real cards, forced-Gemini proof, acceptance run).
- [ ] With R3: pick the mission case from the published cards (≥3 strong matches + one clean gap), never scripted.

"Done when" for every card: it survives a line-by-line challenge against its source by the person whose name is on it.

## 13. Changelog of this file

| Date | main | Change |
|---|---|---|
| 2026-11-10 | `e12c4e6` | First version, after the console merge |
| 2026-11-10 | `12c3b43` + patch | Day count confirmed; §12 card-verification guide; PageSpeed re-run + bundle regression |
| 2026-11-10 | `3d257b0` + patch | Re-baselined to the official start (Sat 11-14 = Day 1); §5 event-window plan; FAQ conflict + DISCLOSURE.md; Round 4 decisions; §12 agenda moved to Day 1 |
| 2026-11-10 | `21bb12c` + patch | Ruling recorded; console code-split shipped; PageSpeed row updated; §5 prep rows unblocked |
