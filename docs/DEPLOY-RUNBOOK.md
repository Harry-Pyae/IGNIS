# Deploy runbook (owner steps)

These steps need account access, so the team lead does them once. Everything else is already in the repo.
Takes about 15 minutes.

## 1. Supabase (database)

1. Go to <https://supabase.com/dashboard> → **New project**. Name: `ignis`. Pick the region closest to the
   judges (US East is a safe default). Save the database password somewhere private.
2. When the project is ready, open **SQL Editor → New query**, then paste and **Run** each file **in this order**:
   1. `supabase/migrations/0001_init.sql`
   2. `supabase/migrations/0002_round2.sql`
   3. `supabase/migrations/0003_rate_limit.sql`: the shared per-IP rate limit. **Don't skip it.** Without it
      the limiter fails open by design, so nothing breaks visibly but the public API has no request cap.
   4. `supabase/seed.sql` (3 **draft** cards: invisible to the public until R1 verifies them in `/curate`)

   Any later migration in `supabase/migrations/` goes in numeric order, before the seed.
3. **Project Settings → API**. Copy three values:
   - Project URL → `SUPABASE_URL`
   - `anon` / publishable key → `SUPABASE_ANON_KEY`
   - `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY` (**never** paste this anywhere public)

## 2. Vercel (hosting + API)

1. Go to <https://vercel.com/new> → **Import Git Repository** → `Harry-Pyae/IGNIS`.
2. Framework preset: **Vite**. Build command `npm run build`, output directory `dist`, install `npm ci`
   (already set in `vercel.json`). Node.js version: **24.x** (picked up from `package.json` engines).
3. **Environment Variables**: add each of these for **Production and Preview**. Use these exact names, with **no `VITE_` prefix**:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | from step 1.3 |
   | `SUPABASE_ANON_KEY` | from step 1.3 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1.3 |
   | `GROQ_API_KEY` | console.groq.com → API Keys |
   | `GEMINI_API_KEY` | aistudio.google.com → Get API key (optional failover) |
   | `LLM_PROVIDER_ORDER` | `groq,gemini` |
   | `CURATOR_SECRET` | a long random string, e.g. the output of `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"` |

   The two public values are compiled into the frontend at **build** time. If you add or change them later,
   **redeploy**.
4. **Deploy**. When it's green, copy the production URL (e.g. `https://ignis-xxxx.vercel.app`).

## 3. Hand back to Coder A

Send Coder A (privately): the production URL, and confirmation that all 7 variables are set for Production + Preview.
Coder A then runs the live verification (R3 repeats it in `docs/QA-LOG.md`):

**Production holds real data only (AGENTS.md guardrail):** no test records, labeled or temporary, ever. Anything that
writes cards runs on the disposable database; production checks are read-only or use R1's real verified cards.

- RLS + the `/curate` draft → verify → publish → correction lifecycle: on the **disposable** database only
  (`npm run test:db` locally, or the CI `db` job, which runs it on every push). Never with `IGNIS_DB_TESTS_REMOTE`
  pointed at production.
- Read-only RLS check on production: as anon, `GET /rest/v1/experiments` returns only verified rows (drafts
  invisible) and `catalog_stats()` returns counts only; an anon insert is rejected (nothing is written).
- Synthesize + briefing-cache round trip on production: only once R1 has published real verified cards.
- A provider smoke test from Vercel (Groq is expected to work from US infrastructure; Gemini as failover).
- A rate-limit 429 check (proves 0003 is applied): 21+ `POST /api/parse-scenario` with body `{}` from **one**
  IP (one `curl` call with repeated URLs reuses one connection), expecting 429 + `retry-after` after 20.
- `GET /api/health-llm` with the curator secret: both providers `reachable: true`.
- **Failover rehearsal (R3's demo-day checklist):** proves the backup provider completes real requests, not just a
  ping. Run each step **once** (AGENTS.md Gemini quota rule). The header only works with the curator secret; without
  it, it is silently ignored.
  1. Parse on Gemini: `curl -X POST https://<live-url>/api/parse-scenario -H 'content-type: application/json'
     -H 'x-ignis-provider: gemini' -H 'x-curator-secret: <secret>' -d '{"text":"PMMA panel at 21% oxygen, 10 cm/s airflow"}'`.
     Expect 200 with `"provider":"gemini"` and filled scenario fields.
  2. Synthesize on Gemini, **only with R1's real verified cards** (never a test card): same two headers on
     `POST /api/synthesize` with a real scenario and real `experiment_ids`. Expect `"status":"ok"` and
     `"provider":"gemini"`. Forced runs bypass the briefing cache (no read, no write), so a rehearsal never changes
     what the public is served.
  3. Then one unforced parse (no headers): `"provider":"groq"`, confirming normal order is back.
- An absolute `og:image` / canonical URL, a favicon tab screenshot, and PageSpeed (mobile + desktop) on the live
  URL. Use PageSpeed or Lighthouse with `--throttling-method=devtools`, never simulated Lighthouse from a VPN-routed
  machine.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Header says "Catalog not connected" | `SUPABASE_URL` / `SUPABASE_ANON_KEY` missing at build time → set them, redeploy |
| `/api/*` returns `not_configured` | The server-only variable named in the message is missing for that environment |
| `/curate` says "Invalid curator secret" | The value typed doesn't match `CURATOR_SECRET` in that environment |
| Synthesize returns `llm_unavailable` / fallback | Provider key missing or rate-limited; the deterministic evidence-only briefing still renders |
