# IGNIS — state handoff (2026-11-09, after round 3)

Snapshot written by Coder A at the end of the round-3 patch. Overwrite on the next handoff.

## Main and the live site

- **main:** `e3267a0` (all code: Merge #8, round 3). This file lands in the docs-only commit right after it.
- **Live:** <https://ignisprototype01.vercel.app>, serving `e3267a0`. Vercel Production deploys from `main`; CI (check + disposable-DB) is green on every `main` commit. Vercel builds one at a time, so a merge can wait ~15 min behind branch previews.
- **Deployed:** the landing page and app shell, `/curate`, `/kit`, plus the API routes:
  - `parse-scenario` (LLM)
  - `synthesize` (validated claims + briefing cache keyed by `catalog_revision`)
  - `extract` (curator only; worked BASS example in the prompt)
  - `curate-write` / `curate-cards` (curator only)
  - `export` (verified cards + schema README; wired to the header and footer buttons)
  - `health-llm` (curator only)
- **For the console (Coder B), all on `main`:**
  - `useVerifiedCatalog()`: validated verified rows + their revision. States: loading · unavailable (not_configured | error | changing) · empty · ready. Loaded lazily, so Zod stays off the landing path.
  - `evidenceViews()`: all verified / eligible / plotted / not plotted / top-k, plus coverage.
  - The engine: `retrieve()`, `whyMatched()`, `resolveMaterial()`, `SCENARIO_PRESETS`, `gapGrid()` / `gapRadar()` (with `availability`).
- **One snapshot:** synthesize, export and the browser loader read rows + `catalog_revision` together (`src/lib/snapshot.ts`). Header and body share one catalog summary store, and counts and rows reconcile to one revision.
- **LLM:** Groq `openai/gpt-oss-120b` first, then Gemini `gemini-3.5-flash`. `GROQ_MODEL` / `GEMINI_MODEL` override; `GET /api/health-llm?groq_model=…` tries a candidate without a deploy. **Gemini runs `gemini-3.5-flash-lite` via `GEMINI_MODEL` (flash quota exhausted), see Open risks.**
- **Database:** Supabase project `zvzofutgfwzptlbfibpz`, migrations 0001–0003 applied. Catalog: **0 verified, 3 drafts** (measured live at the end of round 3).
- **History** was rewritten on 2026-11-09 (all branches). If your clone predates that, stash your work, then run `git fetch origin && git reset --hard origin/<branch>`.
- **Decisions:** `docs/DECISIONS-ROUND2.md`, then `docs/DECISIONS-ROUND3.md`. The round-3 review inputs are kept outside the repo; DECISIONS-ROUND3 carries what the team acts on.

## Pull requests

**No PRs are open.** #8 (round 3) is merged. Earlier: #2, #4, #5, #6, #7 merged; #1 and #3 were closed by a branch rename and continued as #4 and #5. Fully merged branches that can be deleted: `cache-and-export`, `live-urls`, `llm-models`, `matching-engine`, `rate-limit`, `state-doc`, `round3`.

## Live-check scoreboard

| Check | Result |
|---|---|
| Synthesize round trip | ✅ round 3: status ok via Groq, 0 withheld; `catalog_revision` matches the catalog; `E1` maps to the card's UUID; second call served from cache. ⚠️ Used a temporary test card in production. **Not to be repeated** (new rule below): the next production run uses R1's real cards. |
| Verified-catalog loader against production (anon) | ✅ round 3: `empty`, revision `empty`, 0 invalid; not-configured and error paths distinct; radar `no_plottable_evidence` |
| Export (header + footer, live) | ✅ round 3: `ignis-catalog-empty.json`, `count: 0`, 33-field README, no fixtures |
| health-llm | ⚠️ round 3: groq 200 (~300 ms); gemini 429 quota. No key material in responses |
| Disposable-DB CI job (RLS + lifecycle, migrations 0001–0003) | ✅ round 3: 15/15 |
| Provider smoke test + parse-scenario round trip | ✅ 200 via Groq |
| RLS + `/curate` lifecycle | ✅ 15/15 on the disposable DB in CI (every push). Earlier live-project runs wrote test rows, so they are **not to be repeated**; production gets read-only checks only. |
| Rate-limit 429 (0003 applied) | ✅ 20 allowed, then 429 with `retry-after`. Fails open if the counter is unreachable. |
| og:image / canonical / og:url | ✅ absolute `https://ignisprototype01.vercel.app` URLs |
| PageSpeed mobile (Google servers) | ✅ FCP 0.8 s · LCP 2.1 s · TBT 0 ms · CLS 0.001 · SI 1.1 s (before round 3) |
| Favicon tab screenshot | ⏳ R3, in the QA checklist |

**Measurement rule:** PageSpeed or Lighthouse with `--throttling-method=devtools` is the reference. Never use simulated Lighthouse from a VPN-routed dev machine.

**Production-data rule (2026-11-09, AGENTS.md guardrail):** never create, publish, edit or delete records in the production catalog or its briefing cache for testing, labeled or temporary. Round trips without verified data run on the disposable DB or wait for R1's signed cards.

## Open risks

| Risk | Impact | Owner / next step |
|---|---|---|
| **Gemini flash quota exhausted** (429 on `gemini-3.5-flash` and `gemini-3.6-flash` since 2026-11-09; likely drained by today's health-llm probes, each of which is a real generation). | **Mitigated:** `GEMINI_MODEL=gemini-3.5-flash-lite` set in Production + Preview. health-llm 2026-11-09 05:58Z: groq 200, gemini (lite) 200, so failover is reachable again. **Not yet proven:** a full parse-scenario round trip on Gemini; the adapter has no per-request provider override (order comes only from `LLM_PROVIDER_ORDER`). | Team lead: decide how to run the forced-failover proof, and whether to revert to flash once it recovers. Coder A: one targeted probe on 2026-11-10 (`?gemini_model=gemini-3.5-flash`, a single call) and report. |

## Next actions

| Owner | Action |
|---|---|
| **R1** | Re-verify the 3 seed cards against NTRS 20150008962 and publish them in `/curate` under your own name. The public catalog stays at 0 until then. Decide the GMT45-T4 changing-flow question (`docs/DECISIONS-ROUND2.md`). Next sources in order: complete BASS-II runs → Saffire I/II/IV → obtainable MIST papers (DECISIONS-ROUND3 #5). |
| **R1** | Card a real wire/cable insulation material and a real cargo packaging material, then send Coder A each card's `fuel_material`. This activates two presets (AGENTS.md → Open handoffs). |
| **R2** | A few correctly associated, ledgered stills before thumbnail count (DECISIONS-ROUND3 #6). |
| **Coder B** | Reset `console` to `origin/main`'s lineage (history was rewritten). Build the console on `useVerifiedCatalog()` + `evidenceViews()` + the engine, never on fixtures in public UI. The async Brief contract (DECISIONS-ROUND3 #7): tag each Brief request with scenario + `catalog_revision`, drop late responses, synthesize on confirmed/settled input, and resolve citations through the response's `evidence` mapping. Review §3 is input, not commitment. Preset values (21 % O₂ / 101.325 kPa) render as editable inputs with `COPY.sliderCaption`. |
| **R3** | Daily QA on the live URL (390/1024/1440, reduced motion, export, empty/error/retry states); favicon tab screenshot; pick the demo scenario from R1's coverage note once cards exist. |
| **Team lead: environment setup** | Vercel env vars set, migrations 0001–0003 applied and verified. **Open:** Gemini quota/billing (see Open risks). "Nothing else pending" refers to environment setup only, not product integration. |
| **Coder A** | **Queue empty; no new code without the team lead's kick-off.** It reopens on either (a) Coder B's first console PR needing contract support or review, or (b) the integration checkpoint once R1 publishes signed cards. One standing check: a single `health-llm?gemini_model=gemini-3.5-flash` probe on 2026-11-10 (Open risks). Waiting for (b): warm the briefing cache for the catalog-supported demo scenario (not necessarily PMMA); the checkpoint parse → confirm → resolve → retrieve → synthesize → cite source on real cards, with cache hit, provider failure, and correction/unpublish exercised on the disposable DB; then the final acceptance run (Build Plan §12). Low priority, only alongside other work: PageSpeed "render-blocking ~150 ms" and "cache lifetimes 7 KiB" (`/art/(.*)` rule in `vercel.json`). |

## Deliberate deferrals left in code (no TODO or stub markers)

- `src/engine/aliases.ts:36`: "cable jacket" stays a class hint until R1 cards an insulation material.
- `src/engine/aliases.ts:102`: the Cargo packaging preset has no material until R1 names one.
- `src/main.tsx:12`: pathname switch instead of a router; add react-router only if Coder B needs nested routes.
