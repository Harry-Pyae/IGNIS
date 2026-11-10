<p align="center">
  <img src="public/art/mission-patch.png" width="160" height="160" alt="IGNIS mission patch (illustration)" />
</p>

<h1 align="center">IGNIS</h1>
<p align="center"><b>Evidence-first fire-safety intelligence for human spaceflight</b><br/>
by <b>Team AstroFlare</b> · 
NASA Space Apps 2026 · Flame in Freefall</p>

Describe a spacecraft fire scenario in mission terms and IGNIS retrieves the closest verified NASA microgravity
combustion experiments, explains what they actually observed, and marks where the current catalog has no matching
verified evidence.
**IGNIS refuses to guess.**

- **Build plan (technical contracts):** [IGNIS_BUILD_PLAN.md](IGNIS_BUILD_PLAN.md)
- **Team plan (who owns what):** [IGNIS_TEAM_PLAN.md](IGNIS_TEAM_PLAN.md)
- **Git + coding rules for humans and agents:** [AGENTS.md](AGENTS.md)
- **Round 2 decisions, approved copy, validation guarantee:** [docs/DECISIONS-ROUND2.md](docs/DECISIONS-ROUND2.md)
- **Deploying:** [docs/DEPLOY-RUNBOOK.md](docs/DEPLOY-RUNBOOK.md)

## Disclosure

Our team built this platform during a **preparation phase (2026-11-07 → 2026-11-13)**, before the official event
window (**2026-11-14 → 11-15**). That work is specific to the Flame in Freefall challenge, so we're disclosing it to
the organizers and asking for their ruling. The full statement covers the dates, contents, the NASA data handled, our use of AI tools, and third-party credits:
**[docs/DISCLOSURE.md](docs/DISCLOSURE.md)**. All card extraction, verification and publication happens inside the
event window.

## Quick start

```bash
git clone https://github.com/Harry-Pyae/IGNIS.git && cd IGNIS
git checkout console              # your branch (Coder B) — see AGENTS.md
nvm use                           # Node 24.x (.nvmrc)
npm ci
cp .env.example .env              # values come from Coder A, privately
npm run dev                       # http://localhost:5173  (also serves /api/* locally)
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server + local `/api/*` routes (same handlers Vercel runs) |
| `npm run typecheck` / `lint` / `test` / `build` | What CI runs on every push and PR — keep it green |
| `npm run test:smoke` | Live LLM call per provider (needs keys + network reach; Groq blocks some regions) |
| `npm run db:local` | Throwaway Supabase-compatible DB in Docker (migrations + seed) → writes `.env.disposable` |
| `npm run dev:local` | The app against that local DB (curator secret `local-curator-secret`) |
| `npm run test:db` | RLS access matrix + draft→publish lifecycle on a fresh throwaway DB |

**Local LLM calls always run on Gemini.** Groq answers `403 Access denied` from the team's network, so locally every
parse and Brief fails over to Gemini. That's expected: don't "fix" the key. Production runs its functions in Vercel `iad1`
(pinned in `vercel.json`), where Groq is primary. Gemini defaults to `gemini-3.5-flash-lite` (decision 11); never point
local dev at flash, because local traffic would spend its quota.

Pages: `/` public app · `/curate` curation (server-protected writes) · `/kit` design-kit reference for Coder B.

## Layout

```
api/                      Vercel serverless routes (Web-standard POST handlers)
  parse-scenario.ts       LLM Job A — public, rate-limited
  synthesize.ts           LLM Job B + §7.4 claim validation — public, rate-limited
  extract.ts              LLM Job C — curator secret
  curate-write.ts         the only DB write path — curator secret, service role
src/lib/types.ts          shared contracts + Zod schemas (owner: Coder A)
src/server/               llm adapter, claim pipeline, http guards, db clients, prompts
src/styles/tokens.css     §8.3 tokens + motion inventory
src/components/ui/        Panel, Button, Chip, Select, Slider, Badge, Icon, …
src/pages/                Home (landing + console scaffold), Curate, Kit
supabase/migrations/      schema (§4) + RLS (§10)
supabase/seed.sql         3 DRAFT seed cards (BASS / BASS-II, NTRS 20150008962) awaiting R1 sign-off
tests/                    claims probes, gates/coverage, extraction, endpoint boundary, fixtures, db/ (RLS + lifecycle)
public/art/               branding art pack (decor only — never experiment data)
```

## API contracts

All bodies are JSON, validated with Zod (`src/lib/types.ts`). Errors are always
`{ "error": { "code", "message", "issues?" } }` with codes `invalid_request` 400 · `unauthorized` 401 ·
`rate_limited` 429 · `llm_unavailable` / `db_error` 502 · `not_configured` 503 · `internal` 500.

| Route | Request | Response |
|---|---|---|
| `POST /api/parse-scenario` | `{ text }` | `{ scenario: ParsedScenario, provider }` |
| `POST /api/synthesize` | `{ scenario: ResolvedScenario, experiment_ids: uuid[1..5] (unique) }` | `Briefing { status, claims, withheld_count, evidence, coverage, catalog_revision, provider }` |
| `POST /api/extract` 🔒 | `{ text }` | `{ draft: ExtractDraft, dropped, provider }` |
| `POST /api/curate-write` 🔒 | `{ action: 'save_draft', id?, record }` · `{ action: 'publish', id?, record, verified_by }` | `201/200 { experiment }` |
| `GET /api/curate-cards` 🔒 | `?id=` optional | `{ items }` or `{ experiment }` |
| `GET /api/export` | none | Download `ignis-catalog-<rev>.json`: `{ format, readme, catalog_revision, exported_at, count, experiments }` (verified cards only; `count: 0` + README when the catalog is empty) |
| `GET /api/health-llm` 🔒 | `?groq_model=` / `?gemini_model=` optional (try a candidate model for this probe only) | `{ deployment, provider_order, vars_present, misnamed_vars, providers[] }`: per provider `{ configured, reachable, status, elapsed_ms, model, failure, provider_message, available_models }`. Never returns a key or env var value. |

🔒 = header `x-curator-secret`. Synthesize re-reads the catalog as the public role and applies the eligibility gates
before any provider call (`ineligible_evidence` 400 otherwise), so clients can never inject or mis-scope evidence.
Synthesize, export and the browser loader read rows + `catalog_revision` as one snapshot (`src/lib/snapshot.ts`);
`db_error` 503 means the catalog kept changing during the read, so retry. Public routes are rate-limited per IP
(parse-scenario 20/min, synthesize 10, export 10) by the shared Postgres counter from migration 0003.
Failover rehearsal: `x-ignis-provider: groq|gemini` **with** `x-curator-secret` forces one provider on parse-scenario
and synthesize (forced synthesize bypasses the briefing cache). Without the secret the header is ignored. Steps are in
the deploy runbook §3.

## Database setup (once, Coder A)

1. Create a Supabase project. In **SQL Editor**, run every migration **in order**, then the seed:
   `supabase/migrations/0001_init.sql` → `0002_round2.sql` → `0003_rate_limit.sql` → `supabase/seed.sql`
   (3 **draft** cards, public only after R1 verifies them in `/curate`). Skipping 0003 is silent: the rate
   limiter deliberately fails open, so the site works but has **no shared request cap**. Check with a real 429
   after deploy (runbook §3).
2. Put the URL + anon + service-role keys in `.env` and in Vercel.
3. Locally, `npm run test:db` proves the RLS matrix and the draft→publish lifecycle on a throwaway database.

## Deploy

Follow [docs/DEPLOY-RUNBOOK.md](docs/DEPLOY-RUNBOOK.md). `vercel.json` holds the SPA rewrite, `/art/*` cache headers
and function limits. `main` deploys after the daily merge window.

---

Evidence: NASA NTRS / PSI public sources. Art in `public/art/` (including the patch above) is AI-assisted
branding — never NASA experiment imagery. See [docs/brand-assets.md](docs/brand-assets.md).
