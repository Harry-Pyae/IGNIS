# Day 1 runbook — the single execution order

Updated 2026-11-13. **Prep complete, frozen for the event.** Live = `main` `b7602ba` (pushed 2026-11-13 on the
team lead's instruction; CI `check` + `db` green; Vercel production reports `b7602ba`). During the event, code changes
are bug fixes and the steps below only. The five Core Principles outrank this file.

Every step is already rendered behind a gate. Inserting signed data is the remaining work. No agent signs for a human.
**Production holds real data only**: no test cards, ever (AGENTS.md). Gemini: one call per check, never polled.

## Verified live empty state (baseline, 2026-11-13)

`/api/export`: `count 0`, revision `empty` · landing: "Catalog in verification — 3 cards in review", mission
availability line shown, no start button · console (1280 + 390 px): "No verified records… to plot yet",
`0 eligible · 0 with plot coordinates · 0 missing plot coordinates`, no horizontal overflow, no console errors, no
`/api` calls on load · research context section omitted · `health-llm` (once): Groq `openai/gpt-oss-120b` and Gemini
`gemini-3.5-flash-lite` both reachable. Any step that fails: compare against this baseline first.

## Steps, in order

| # | Owner | Action | Visible when | If it fails (rollback) |
|---|---|---|---|---|
| 0 | A + R1 | Before the first publish: run the read-only duplicate query (`DEPLOY-RUNBOOK.md` §1), then `supabase/migrations/0004_experiment_identity.sql` in the SQL editor. | Never visible; a duplicate save then returns `409 duplicate_experiment`. | Index creation fails on conflicts and changes nothing → R1 reconciles, rerun. Undo if needed: `drop index public.experiments_campaign_test_identity;`. The app works without it (just no DB-level guard). |
| a | R1 | Re-verify the 3 seed drafts (BASS GMT96-T7, GMT96-T8, BASS-II GMT45-T4; NTRS 20150008962) against the PDF and publish each under own name in `/curate`. Decide GMT45-T4's changing-flow question in `catalog-coverage.md`. | Dots on the map (all three have O₂ + airflow); `/api/export` count = published; landing count updates. | Wrong card: reopen in `/curate` and save as draft (unpublishes until re-verified). No dot: the card lacks O₂ or airflow (shown in the missing count, by design). Not in export: it isn't published. |
| b | R1 | Continue `docs/sources.md` order to 15+ cards; one card per campaign + test ID; fill the coverage snapshot. Cable/cargo: send A the exact `fuel_material` of a verified card → A sets `SCENARIO_PRESETS[].material` in `src/engine/aliases.ts`. | Each publish; presets: next deploy (picker until then). | `409` → reopen the existing card and reconcile sources. Bad preset → revert `material: null` (picker returns). Don't publish to reach 15. |
| c | A | Real-data integration checkpoint on production through the public UI: parse → confirm → match → synthesize → Brief; click each citation through to the card and its source URL. Log in `QA-LOG.md`. | Brief with OBSERVED/SUPPORTED claims citing real cards. | Synthesize failure shows "Briefing unavailable — showing matched evidence only" (a valid state; demo continues). Log it, bug-fix only, redeploy; Vercel → Deployments → Instant Rollback to the previous production build if a deploy regresses. |
| d | A | Forced-Gemini synthesize proof, `DEPLOY-RUNBOOK.md` §3 failover steps 1–3, **once each**, real cards only. | `"provider":"gemini"`, `"status":"ok"`; then an unforced parse returns `groq`. | Record the result; do not retry in a loop. One `health-llm` call to diagnose. Groq stays primary; the evidence-only fallback still covers a double outage. |
| e | R1 + R3 → A | Pick the mission case from `catalog-coverage.md` (preset with a set material, ≥3 distinct verified UUIDs, the reviewed gap). A fills `MISSION_CASE` in `src/engine/mission.ts` (one line, template in its comment), CI, deploy. The 3 seeds alone fit `crew-clothing` if R1 keeps all three. | Landing shows the mission start button instead of the availability line. | The gate rejects silently into the honest availability line (wrong UUID, unverified card, <3, preset without a material, or an ID not in that preset's current top 5). Fix the IDs, or set it back to `null` and present the case presenter-led. |
| f | A | Warm the briefing cache: run the mission case once on production (unforced), then again. | Second synthesize response has `"provider":"cache"`. | Cache keys include the catalog revision and `prompts-v5`: **any later publish or card edit (including g) makes it cold** → re-warm after the last publication. A cold cache just costs one generation. |
| g | R2 (+ R1 association) | Attach approved stills via `/curate` `media_url` (ledger row = Approved). Then R1 republishes the card. | Image on the match card, labeled "Campaign context". | Saving unpublishes the card until re-verified: it drops out of the catalog and can close the mission gate until republished. Bad image: clear `media_url` and republish; a text card always works. Prefer doing g before f. |
| h | R3 | Usability test ×3 (uncoached), paired-source task, `QA-LOG.md` with actual results, demo rehearsals + backup recording (`demo-script.md`). | QA-LOG rows with names, dates, results. | Record failures as they happened; B fixes the top obstacle (bug-fix only); cut per the order below. |

## Where the remaining data goes

| Data | Signs | Location |
|---|---|---|
| Experiment cards (`media_url`, `source_section`, `condition_changes`) | R1 (R2 stills) | `/curate`, published under the reviewer's own name |
| Mission case | R1 + R3 → A | `MISSION_CASE`, `src/engine/mission.ts` |
| Cable/cargo preset material | R1 → A | `SCENARIO_PRESETS`, `src/engine/aliases.ts` |
| Environment presets / research context | R1 → A | `src/engine/environments.ts`, `src/lib/context-content.ts` via `docs/FACT-CHECK-QUEUE.md` |
| Coverage snapshot / mission rationale | R1 | `docs/catalog-coverage.md` |
| Media provenance | R2 / R1 | `docs/media-ledger.md` |
| Retrieval benchmark | R1 → A | two local JSON files, `docs/retrieval-benchmark.md` |
| Usability, acceptance, rehearsals | R3 | `docs/QA-LOG.md`, `docs/demo-script.md` |
| Burmese UI | R3 | `src/i18n/my.draft.ts` + `docs/MY-REVIEW.md` (CI guard) |
| Submission | R3 / A | `docs/submission-checklist.md` |

**Cut order (§5.2):** Burmese UI → extra media stills → optional two-card comparison → unsigned environment presets.
Never cut human verification, source traceability, real-data acceptance records, or bounded gap explanations. The
core works with English, text cards and the evidence-only narration fallback.

## Status matrix

| Surface | Shipped (live `b7602ba`) | Content signed | QA |
|---|---|---|---|
| Retrieval, cards, map, Brief, export | Source links as recorded, map populations + outcome shapes, axes from the shared GRID, interpretation limits (`prompts-v5`), catalog-unavailable retry | 0 verified, 3 drafts | Empty states verified live; real-card acceptance = step c |
| Guided mission | Gate: named reviewer, preset with a material, ≥3 distinct verified solid IDs, all in the preset's current top 5 | `MISSION_CASE = null` | Gate tests; real mission = step e |
| Duplicate protection | `409 duplicate_experiment` live; migration 0004 not yet applied | — | 16/16 disposable DB tests; apply = step 0 |
| Card stills | Renderer, "Campaign context" label | No approved ledger rows | Step g |
| Environment / research context | Signed-only renderers | Unsigned → hidden | R1 review |
| Burmese | Draft import guard | Unreviewed → English only | CI guard |

Environment presets and research context publish through R1's named, sourced handoff to A (their existing code
gates), not `/curate`; that is a deliberate contract choice, not a CMS gap. Spec traceability (P0.1–P2, §5.1–5.2)
is in git history at `82c63d2`.
