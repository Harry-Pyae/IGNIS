# IGNIS — state handoff (2026-11-09)

Snapshot written by Coder A at the end of the engine sprint. Overwrite on the next handoff.

## Main and the live site

- **main:** `2d07075` (all code). This file lands in the commit right after it, a docs-only change.
- **Live:** <https://ignisprototype01.vercel.app>. Vercel Production deploys from `main`. Every commit on `main` has green CI (check + db) and a green Vercel deploy.
- **Deployed:** the landing page and app shell, `/curate`, `/kit`, plus the API routes:
  - `parse-scenario` (LLM)
  - `synthesize` (validated claims + briefing cache keyed by `catalog_revision`)
  - `extract` (curator only; worked BASS example in the prompt)
  - `curate-write` / `curate-cards` (curator only)
  - `export` (verified cards + schema README)
  - `health-llm` (curator only)

  The deterministic engine (`src/engine/`: alias resolver, matching, gap grid + radar) is on `main` for the console to import.
- **LLM:** Groq `openai/gpt-oss-120b` first, then Gemini `gemini-3.5-flash`. The old defaults are retired. `GROQ_MODEL` / `GEMINI_MODEL` override them; `GET /api/health-llm?groq_model=…` tries a candidate without a deploy.
- **Database:** Supabase project `zvzofutgfwzptlbfibpz`, migrations 0001–0003 applied. Catalog: **0 verified, 3 drafts**.
- **History** was rewritten on 2026-11-09 (all branches). If your clone predates that, stash your work, then run `git fetch origin && git reset --hard origin/<branch>`.

## Pull requests

**No PRs are open.** #2, #4, #5 and #6 are merged; #1 and #3 were closed by a branch rename and continued as #4 and #5. The `llm-models` fixes (`3fc20e2`, `e26a3bd`, `12bea64`) went to `main` without a PR, to unblock the provider check. The branches `cache-and-export`, `live-urls`, `llm-models`, `matching-engine` and `rate-limit` are fully merged and can be deleted.

## Live-check scoreboard

| Check | Result |
|---|---|
| health-llm | ✅ groq 200 (~300 ms), gemini 200 (~1.3 s); responses carry no key material |
| Provider smoke test + parse-scenario round trip | ✅ 200 via Groq; unstated values stay null; raw material phrase passed to the resolver |
| RLS: drafts hidden, verified visible, anon writes denied | ✅ 14/14 DB tests against the live project; catalog left unchanged |
| `/curate` draft → publish → correction un-publishes (live API) | ✅ throwaway card deleted afterwards |
| Export | ✅ attachment + 33-field README |
| Rate-limit 429 (0003 applied) | ✅ 20 allowed, then 429 with `retry-after`. Fails open if the counter is unreachable. |
| og:image / canonical / og:url | ✅ absolute `https://ignisprototype01.vercel.app` URLs |
| PageSpeed mobile (Google servers) | ✅ FCP 0.8 s · LCP 2.1 s · TBT 0 ms · CLS 0.001 · SI 1.1 s |
| Synthesize + briefing cache, live | ⏳ needs verified cards (catalog is 0) |
| Favicon tab screenshot | ⏳ R3, in the QA checklist |

**Measurement rule:** PageSpeed or Lighthouse with `--throttling-method=devtools` is the reference. Never use simulated Lighthouse from a VPN-routed dev machine.

## Next actions

| Owner | Action |
|---|---|
| **R1** | Re-verify the 3 seed cards against NTRS 20150008962 and publish them in `/curate` under your own name. The public catalog stays at 0 until then. Also decide the open question in `docs/DECISIONS-ROUND2.md` about GMT45-T4 (changing flow). |
| **R1** | Card a real wire/cable insulation material and a real cargo packaging material, then send Coder A each card's `fuel_material`. This activates two presets (see AGENTS.md → Open handoffs). |
| **Coder B** | Rebase `console` (`git reset --hard origin/console` after the rewrite). Build the console against the frozen contracts and fixtures (`src/lib/types.ts`, `src/lib/fixtures.ts`) and the engine (`retrieve()`, `whyMatched()`, `resolveMaterial()` / `resolutionLine()`, `SCENARIO_PRESETS`, `gapGrid()` / `gapRadar()`). Preset values (21 % O₂ / 101.325 kPa) must render as editable scenario inputs, with `COPY.sliderCaption`, never as evidence. |
| **R3** | Daily QA on the live URL; favicon tab screenshot; pick the demo scenario from R1's coverage note once cards exist. |
| **Team lead (Coder A role)** | Nothing pending: migration 0003 is applied and verified. |
| **Coder A (next patch, waits for the explicit kick-off)** | (1) Client loader for the verified catalog (anon read in `src/lib/catalog.ts`) so the console can feed `retrieve()`. (2) Once cards exist: warm the briefing cache for the demo scenario, then run the full live flow parse → match → synthesize → validated Brief (the integration checkpoint). (3) Final acceptance run (Build Plan §12). (4) Low priority, only alongside other work: PageSpeed "render-blocking ~150 ms" (fonts are self-hosted, so likely the app CSS) and "cache lifetimes 7 KiB" (check the `/art/(.*)` header rule in `vercel.json` matches the served paths). |

## Deliberate deferrals left in code (no TODO or stub markers)

- `src/engine/aliases.ts:36`: "cable jacket" stays a class hint until R1 cards an insulation material.
- `src/engine/aliases.ts:102`: the Cargo packaging preset has no material until R1 names one.
- `src/main.tsx:12`: pathname switch instead of a router; add react-router only if Coder B needs nested routes.
