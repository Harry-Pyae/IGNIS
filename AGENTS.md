# AGENTS.md — IGNIS team + coding-agent rules

Read **IGNIS_BUILD_PLAN.md** (technical contracts) and **IGNIS_TEAM_PLAN.md** (who owns what)
before writing code. Where they disagree, the Build Plan's Core Principles win.

## The five Core Principles (verbatim, IGNIS_BUILD_PLAN.md §2)

1. **No prediction, ever.** IGNIS never claims what a flame *would* do. It only reports what NASA experiments *observed*, flags reasonable interpretation, and marks everything else UNTESTED. The word "predict" is banned from UI copy, code comments, and pitch.
2. **Every AI claim is a validated evidence object.** Generated content is returned as structured claims referencing verified experiment IDs and is server-validated before rendering. Claims that cannot be validated are withheld — visibly (see §7.4).
3. **Deterministic before generative.** Retrieval, matching, ranking, coverage, gap detection, and material-alias resolution are pure algorithms over structured data. The LLM only parses scenarios and narrates retrieved evidence.
4. **Scientific domain purity.** MVP retrieval covers **solid-material flammability only** (BASS, BASS-II, Saffire, SoFIE/MIST). SAME smoke-detection experiments carry their own domain (`smoke_detection`) and never enter solid-flammability retrieval. Liquid-droplet combustion (FLEX) is OUT of the MVP entirely and must never be matched against solid scenarios. The domain gate runs before any similarity scoring.
5. **Honesty beats impressiveness.** Missing data stays null and visible. Original units are preserved alongside normalized values. "Unknown", "untested", and "outside current catalog range" are valid, displayed states — and they are distinct states.

## Team (IGNIS_TEAM_PLAN.md v2)

| Role | Owns | Branch |
|---|---|---|
| **Coder A** — Engine & Integration (team lead) | `main`, engine, API logic, deployment, merges | `main` |
| **Coder B** — Mission Console | the public UI | `console` |
| **Coder C** — Features *(optional)* | the Team Plan's Coder C list | `features` |
| **R1** — Data & Science Research | sources, extraction, verification (the catalog) | none — works in `/curate` |
| **R2** — Media Research | NASA footage/stills, media ledger, pitch video | none |
| **R3** — Testing & Judge Experience | QA log, demo, captions, Burmese review, submission | none |

## Git rules

- **Only Coder A pushes or merges to `main`.** Coder B works on `console`, Coder C on `features`,
  each cut from the latest `main`.
- Research members (R1–R3) don't touch code. They work through `/curate`, shared drives and docs, and send
  repo docs (coverage note, media ledger, QA log, demo script) to Coder A as an issue or a docs-only PR.
- Small commits with clear messages. Open a PR to `main` when a task is done.
- **CI must be green before you open a PR**: `npm run typecheck && npm run lint && npm test && npm run build`.
- **Daily merge window (evening):** Coder A reviews and merges PRs once a day, then `main` deploys and R3 tests it.
  Rebase on `main` each morning: `git fetch && git rebase origin/main`.
- Check your work on the deployed URL, not just localhost.
- Cross-ownership changes (shared types, schema, another branch's files) go through Coder A as a request.

## File ownership

| Path | Owner | Notes |
|---|---|---|
| `src/lib/types.ts`, `src/lib/fixtures.ts`, `src/lib/copy.ts` | Coder A | Shared contracts, edge-case fixtures, approved scientific copy. Changes only via Coder A. |
| `supabase/migrations/*`, RLS, `scripts/local-db.mjs` | Coder A | Schema = Build Plan §4 (0001, verbatim) + additive migrations. |
| `supabase/seed.sql` **records**, `docs/catalog-coverage.md` | R1 | Card content and sign-off. `verified_by` = the reviewer's own name, set only by publishing in `/curate`. |
| `src/styles/tokens.css`, `src/styles/index.css`, `src/components/ui/*` | Coder A | Tokens + primitives. Coder B/C use them, never fork them. See `/kit`. |
| `src/pages/Curate.tsx`, `src/pages/Kit.tsx`, `src/lib/catalog.ts`, `src/components/CatalogStatus.tsx`, `src/components/AppHeader.tsx` | Coder A | Curation path, design kit, client catalog integration, app shell. |
| `src/server/*`, `api/*`, `src/lib/gates.ts`, `src/lib/coverage.ts`, `src/engine/*` (new) | Coder A | Engine, endpoints, claim validation, prompts, briefing cache, export. ONE gate implementation — never fork it. |
| `src/pages/Home.tsx` console sections, `src/components/*` (non-ui, non-shell), `src/i18n/*` (new) | Coder B | The public console built to §8.3. Landing hero/how-it-works/catalog/footer copy is Coder A-approved. |
| `src/features/*` (new) | Coder C | Telemetry modal, auto-play captions, comparison animation, `/curate` quality-of-life — each with a fallback. |
| `docs/sources.md`, `docs/catalog-coverage.md` | R1 | Source queue and the coverage note R3 picks the demo scenario from. |
| `docs/media-ledger.md`, card `media_url` stills, the pitch video | R2 | Real NASA public-domain material only; every asset in the ledger. |
| `docs/QA-LOG.md`, `docs/demo-script.md`, `docs/pitch.md`, `README.md` judge section, MY translations | R3 | |
| `public/art/*` | Coder A | Branding/decor only — never shown as experiment data. |

## Local development

- **Node 24.x** (`.nvmrc`). `nvm use` then `npm ci`.
- `npm run db:local` (needs Docker): a throwaway Supabase-compatible database with migrations + seed,
  writes `.env.disposable`. Then `npm run dev:local` in a second terminal. Curator secret: `local-curator-secret`.
- `npm run test:db`: the RLS matrix + curation lifecycle against a fresh throwaway database.
  DB tests only run with `IGNIS_DB_TESTS=1`; never put that in a `.env` that points at a real project.
- Approved copy, decisions and the claim-validation guarantee: `docs/DECISIONS-ROUND2.md`.

## Open handoffs

- **R1 → Coder A, to activate two presets** (`SCENARIO_PRESETS`, `src/engine/aliases.ts`): verify ≥1 `solid_flammability` card of a real wire/cable insulation material (`material_class = insulation`) for *Cable insulation*, and ≥1 card of the cargo packaging material its source actually names for *Cargo packaging*, then send Coder A each card's exact `fuel_material`. Until then both presets open the material picker.

## Guardrails (violations are bugs)

- Nothing predicts: no function, comment or copy uses "predict" / "will burn" / "would burn".
- Absence is bounded: "No matching verified evidence in the current IGNIS catalog." — never "NASA has never tested".
- Publication is a named human: never publish a card under someone else's name or a placeholder.
- The LLM never classifies materials, never explains matches, never touches ranking (§7.1).
- SAME stays domain `smoke_detection`; FLEX is never carded.
- No accounts, no PWA/offline claims, no new dependencies beyond Build Plan §3 without a stated reason in the PR.
- Secrets: only `SUPABASE_URL` / `SUPABASE_ANON_KEY` may reach the browser. Everything else is server-only (`api/`, `src/server/`).
- Art pack images (`public/art/*`) are branding. Never inside the Evidence Map plot, Match Panel thumbnails, or the Mission Brief.
- Motion: nothing loops faster than 1.2s; the Mission Brief and UNTESTED blocks are completely still for every user (`.motion-still`, decision 2); all other animation behind `prefers-reduced-motion: no-preference` (use the `anim-*` classes in `tokens.css`).
