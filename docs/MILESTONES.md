# IGNIS — Milestones

**NASA Space Apps 2026 · "Flame in Freefall" · Team AstroFlare**
This is one self-contained file for checking progress without the repo. Coder A updates it after every patch.

| | |
|---|---|
| **As of** | 2026-11-10 (after the console merge) |
| **main** | `e12c4e6` (60 commits since 2026-11-07) |
| **Live** | <https://ignisprototype01.vercel.app>, serving `a053e14` (the code commit before `e12c4e6`; `e12c4e6` is docs only) |
| **CI** | green: typecheck · lint · 184 tests passed, 17 skipped (DB tests, which run in their own CI job) · build · disposable-DB job |
| **Public catalog** | **0 verified cards**, 3 drafts in review |
| **Overall** | Engine, API and console are built and live. **The critical path is now data:** nothing real can be demoed until R1 publishes verified cards. |

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

## 3. Completed milestones (timeline)

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

## 5. Team Plan schedule vs actual

The Team Plan (written 2026-11-07) gives a ~6-day window. **Day 1 = 2026-11-08 (confirmed by the team lead), so
2026-11-10 is Day 3 and feature freeze is the morning of Day 6 (2026-11-13).**

| Day | Planned (end of day) | Actual |
|---|---|---|
| 1 | Engine: resolver + gates + similarity on seeds · Console: Scenario Builder + static map · R1: seeds re-verified + 5 cards · R2: footage pull · R3: QA checklist | Engine ✅ · Console ✅ (merged Day 3) · R1 ❌ · R2 ❓ · R3 ❓ |
| 2 | Engine complete (gaps, coverage, chips) · Match Panel + map interactions · **15 cards** · R3 captions draft | Engine ✅ · Match Panel ✅ · cards ❌ (0) · captions ❓ |
| 3 | **Integration checkpoint:** parse → match → synthesize → validated Brief on the deployed URL · Guided Demo wired · 20 cards · first QA sweep | 🟡 The flow is proven end to end on the disposable DB and live with empty states; ⛔ **on real cards** it waits for R1 · Guided Demo ❌ · cards ❌ · QA sweep ❓ |
| 4 | Honesty surfaces (gap shading, outside-range, provenance, export) · choreography · 25 cards + telemetry · all stills · dress rehearsal #0 | Honesty surfaces ✅ already · rest pending |
| 5 | Coder C list or fallback · 30+ cards · video rough cut · full QA regression · demo scenario locked | pending |
| 6 | **Feature freeze (morning)** · video final · two timed rehearsals · final acceptance run · submission prepared | pending |

**Cut order when a day slips:** boundary polyline → comparison animation → auto-play captions → telemetry modal →
cards 30→25 → Burmese ships EN-only → choreography reduced to the slider glide.
**Never cut:** matching + chips, Evidence Map, claim validation, UNTESTED/outside-range, the Guided Demo button, the
evidence-only fallback, the video.

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
| PageSpeed mobile | ✅ before round 3 (FCP 0.8 s, LCP 2.1 s, CLS 0.001); **re-run now that the console is live** |
| Favicon tab screenshot | ❓ R3 |

## 8. Decisions log (summary)

**Round 2 (2026-11-07):** (1) the Team Plan supersedes Build Plan §9/11/12/14 · (2) the Brief and UNTESTED blocks are always still · (3) one slider caption ·
(4) absence copy: "No matching verified evidence in the current IGNIS catalog." · (5) ownership table · (6) boundary polyline deferred · (7) Node 24.

**Round 3 (2026-11-09 → 11-10):** (1) catalog-bounded copy everywhere · (2) the pitch line "IGNIS never predicts" is kept · (3) review wireframes are input for Coder B ·
(4) estimates are planning aids · (5) R1's source order: seeds → BASS-II → Saffire I/II/IV → MIST · (6) a correctly associated still beats thumbnail count ·
(7) async Brief + revision-binding contract · (8) canonical airflow parsing (still air = 0, unmentioned = null) ·
(9) shared-primitive changes need Coder A sign-off · (10) match summary names every uncounted parameter ·
(11) Gemini lite is the permanent backup; Groq blocks the team's network, so local dev always runs on Gemini; production runs in `iad1`.

## 9. Open risks and blockers

| Risk | Impact | Next step |
|---|---|---|
| **No verified cards** | Blocks the demo scenario, integration checkpoint, Guided Demo, thumbnails, the production failover proof and the acceptance run | R1: re-verify and publish the 3 seeds today, then 15+ |
| No R2/R3 artifacts in the repo | Can't confirm the video, ledger, QA log or demo script are on track | R2/R3: send docs-only PRs or issues to Coder A |
| Forced-Gemini synthesize unproven on production | Backup path on stage is proven in tests and locally only | Coder A: run once on R1's first real card (runbook §3) |
| Two presets lack materials | Cable insulation and Cargo packaging always open the picker | R1: card a real insulation and a packaging material, send the `fuel_material` names |
| Coder C absent | WOW features cut by default | Follow the fallback rules; nobody absorbs them at the cost of their own "done when" |

## 10. Next actions

| Owner | Action |
|---|---|
| R1 | Publish the 3 seeds under your own name; decide the GMT45-T4 changing-flow question; 15 → 30 cards; coverage note for R3 |
| R2 | Ledgered stills (`media_url`); footage pull; video rough cut by Day 5 |
| R3 | QA the live console at 390/1024/1440 + reduced motion; start `docs/QA-LOG.md`; Guided Demo captions; pick the demo scenario once cards exist |
| Coder B | Rebase `console` on `main`; then thumbnails, Guided Demo wiring, choreography |
| Coder A | Wait for kickoff. On R1's cards: warm the briefing cache for the demo scenario, run the full checkpoint on real cards, the forced-Gemini synthesize proof, then the final acceptance run |

## 11. Codebase at a glance

| Area | Where | Size |
|---|---|---|
| API routes (Vercel functions) | `api/`: parse-scenario, synthesize, extract, curate-write, curate-cards, export, health-llm | 7 routes |
| Server logic | `src/server/`: LLM adapter, prompts, claim validation, synthesis, briefing cache, rate limit, export | |
| Engine (pure, no LLM) | `src/engine/`: aliases, match, gaps, views · `src/lib/gates.ts`, `coverage.ts` | |
| Contracts | `src/lib/types.ts` (Zod), `copy.ts` (approved copy), `fixtures.ts` | |
| UI | `src/pages/Home.tsx` (landing + console), `Curate.tsx`, `Kit.tsx` · `src/components/ui/*` · `src/i18n/` | |
| Database | `supabase/migrations/` 0001–0003 · `supabase/seed.sql` (3 drafts) | |
| Tests | `tests/`: 24 files; `tests/db/` RLS + lifecycle on a throwaway DB | 184 passing |
| Docs | `IGNIS_BUILD_PLAN.md`, `IGNIS_TEAM_PLAN.md`, `AGENTS.md`, `docs/STATE.md`, `DECISIONS-ROUND2/3.md`, `DEPLOY-RUNBOOK.md` | |

Total tracked source + tests + DB + scripts: ~9,300 lines.

## 12. Changelog of this file

| Date | main | Change |
|---|---|---|
| 2026-11-10 | `e12c4e6` | First version, after the console merge |
