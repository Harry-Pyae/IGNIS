# AGENTS.md — IGNIS team + coding-agent rules

Read **IGNIS_BUILD_PLAN.md** (technical contracts) and **IGNIS_TEAM_PLAN.md** (who owns what)
before writing code. Where they disagree, the Build Plan's Core Principles win.

## The five Core Principles (verbatim, IGNIS_BUILD_PLAN.md §2)

1. **No prediction, ever.** IGNIS never claims what a flame *would* do. It only reports what NASA experiments *observed*, flags reasonable interpretation, and marks everything else UNTESTED. The word "predict" is banned from UI copy, code comments, and pitch.
2. **Every AI claim is a validated evidence object.** Generated content is returned as structured claims referencing verified experiment IDs and is server-validated before rendering. Claims that cannot be validated are withheld — visibly (see §7.4).
3. **Deterministic before generative.** Retrieval, matching, ranking, coverage, gap detection, and material-alias resolution are pure algorithms over structured data. The LLM only parses scenarios and narrates retrieved evidence.
4. **Scientific domain purity.** MVP retrieval covers **solid-material flammability only** (BASS, BASS-II, Saffire, SoFIE/MIST). SAME smoke-detection experiments carry their own domain (`smoke_detection`) and never enter solid-flammability retrieval. Liquid-droplet combustion (FLEX) is OUT of the MVP entirely and must never be matched against solid scenarios. The domain gate runs before any similarity scoring.
5. **Honesty beats impressiveness.** Missing data stays null and visible. Original units are preserved alongside normalized values. "Unknown", "untested", and "outside current catalog range" are valid, displayed states — and they are distinct states.

## Git rules

- **Never push to `main`.** `main` belongs to Part 1 (team lead). Nobody else pushes or merges to it.
- Work only on your part's branch, cut from the latest `main`:

  | Part | Owner role | Branch |
  |---|---|---|
  | 2 | Evidence Engine | `part2-engine` |
  | 3 | Mission Console | `part3-console` |
  | 4 | Evidence Catalog | `part4-catalog` |
  | 5 | Source Intelligence & Media | `part5-sources` |
  | 6 | Broadcast & Judge Experience | `part6-broadcast` |

- Small commits with clear messages. Open a PR to `main` when a task is done.
- **CI must be green before you open a PR**: `npm run typecheck && npm run lint && npm test && npm run build`.
- **Daily merge window (evening):** Part 1 reviews and merges PRs once a day, then `main` deploys.
  Rebase on `main` each morning: `git fetch && git rebase origin/main`.
- Check your work on the deployed preview URL, not just localhost.
- Cross-part changes go through Part 1 as a request (issue or PR comment). Never edit another part's files.

## File ownership

| Path | Owner | Notes |
|---|---|---|
| `src/lib/types.ts`, `src/lib/fixtures.ts`, `src/lib/copy.ts` | Part 1 | Shared contracts, edge-case fixtures, approved scientific copy. Changes only via Part 1. |
| `supabase/migrations/*`, RLS, `scripts/local-db.mjs` | Part 1 | Schema = Build Plan §4 (0001, verbatim) + additive migrations. |
| `supabase/seed.sql` **records**, `docs/catalog-coverage.md` | Part 4 | Card content and sign-off. `verified_by` = the reviewer's own name, set only by publishing in `/curate`. |
| `src/styles/tokens.css`, `src/styles/index.css`, `src/components/ui/*` | Part 1 | Tokens + primitives. Part 3 uses them, never forks them. See `/kit`. |
| `src/pages/Curate.tsx`, `src/pages/Kit.tsx`, `src/lib/catalog.ts`, `src/components/CatalogStatus.tsx`, `src/components/AppHeader.tsx` | Part 1 | Curation path, design kit, client catalog integration, app shell. |
| `src/server/http.ts` (rate-limit + curator guard), `src/server/llm.ts`, `src/server/db.ts` | Part 1 | Guard infrastructure, adapter. Part 2 wires the guards into its endpoint logic. |
| `api/*` contracts, `src/server/claims.ts`, `src/server/synthesis.ts`, `src/server/cacheKey.ts` | Part 1 | Request/response shapes, claim validation and the server boundary are final. |
| `src/lib/gates.ts` | Part 2 extends · Part 1 owns signature | ONE gate implementation used by the endpoint and the engine. Never fork it. |
| `src/engine/*` (new), `src/server/prompts.ts`, logic inside `api/*` | Part 2 | Resolver, matching/scoring (semantics frozen in `types.ts`), gap grid, prompts, briefing cache, export endpoint. |
| `src/pages/Home.tsx` console sections, `src/components/*` (non-ui, non-shell), `src/i18n/*` (new) | Part 3 | The public console built to §8.3. Landing hero/how-it-works/catalog/footer copy is Part 1-approved. |
| `docs/sources.md`, card `media_url` stills | Part 5 | Real NASA public-domain material only. |
| `docs/demo-script.md`, `docs/pitch.md`, `README.md` judge section, MY translations | Part 6 | |
| `public/art/*` | Part 1 | Branding/decor only — never shown as experiment data. |

## Local development

- **Node 24.x** (`.nvmrc`). `nvm use` then `npm ci`.
- `npm run db:local` (needs Docker): a throwaway Supabase-compatible database with migrations + seed,
  writes `.env.disposable`. Then `npm run dev:local` in a second terminal. Curator secret: `local-curator-secret`.
- `npm run test:db`: the RLS matrix + curation lifecycle against a fresh throwaway database.
  DB tests only run with `IGNIS_DB_TESTS=1`; never put that in a `.env` that points at a real project.
- Approved copy, decisions and the claim-validation guarantee: `docs/DECISIONS-ROUND2.md`.

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
