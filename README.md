<p align="center">
  <img src="public/art/mission-patch.png" width="160" height="160" alt="IGNIS mission patch (illustration)" />
</p>

<h1 align="center">IGNIS</h1>
<p align="center"><b>Evidence-first fire-safety intelligence for human spaceflight</b><br/>
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

## Quick start

```bash
git clone https://github.com/Harry-Pyae/IGNIS.git && cd IGNIS
git checkout part3-console        # your part's branch — see AGENTS.md
nvm use                           # Node 24.x (.nvmrc)
npm ci
cp .env.example .env              # values come from Part 1, privately
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

Pages: `/` public app · `/curate` curation (server-protected writes) · `/kit` design-kit reference for Part 3.

## Layout

```
api/                      Vercel serverless routes (Web-standard POST handlers)
  parse-scenario.ts       LLM Job A — public, rate-limited
  synthesize.ts           LLM Job B + §7.4 claim validation — public, rate-limited
  extract.ts              LLM Job C — curator secret
  curate-write.ts         the only DB write path — curator secret, service role
src/lib/types.ts          shared contracts + Zod schemas (owner: Part 1)
src/server/               llm adapter, claim pipeline, http guards, db clients, prompts
src/styles/tokens.css     §8.3 tokens + motion inventory
src/components/ui/        Panel, Button, Chip, Select, Slider, Badge, Icon, …
src/pages/                Home (landing + console scaffold), Curate, Kit
supabase/migrations/      schema (§4) + RLS (§10)
supabase/seed.sql         3 DRAFT seed cards (BASS / BASS-II, NTRS 20150008962) awaiting Part 4 sign-off
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

🔒 = header `x-curator-secret`. Synthesize re-reads the catalog as the public role and applies the eligibility gates
before any provider call (`ineligible_evidence` 400 otherwise), so clients can never inject or mis-scope evidence.

## Database setup (once, Part 1)

1. Create a Supabase project. In **SQL Editor**, run `supabase/migrations/0001_init.sql`, then `0002_round2.sql`,
   then `supabase/seed.sql` (3 **draft** cards — public only after Part 4 verifies them in `/curate`).
2. Put the URL + anon + service-role keys in `.env` and in Vercel.
3. Locally, `npm run test:db` proves the RLS matrix and the draft→publish lifecycle on a throwaway database.

## Deploy

Follow [docs/DEPLOY-RUNBOOK.md](docs/DEPLOY-RUNBOOK.md). `vercel.json` holds the SPA rewrite, `/art/*` cache headers
and function limits. `main` deploys after the daily merge window.

---

Evidence: NASA NTRS / PSI public sources. Art in `public/art/` (including the patch above) is AI-assisted
branding — never NASA experiment imagery. See [docs/brand-assets.md](docs/brand-assets.md).
