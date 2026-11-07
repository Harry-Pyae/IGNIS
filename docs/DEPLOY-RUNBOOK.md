# Deploy runbook (owner steps)

These steps need account access, so the team lead does them once. Everything else is already in the repo.
Takes about 15 minutes.

## 1. Supabase (database)

1. Go to <https://supabase.com/dashboard> → **New project**. Name: `ignis`. Pick the region closest to the
   judges (US East is a safe default). Save the database password somewhere private.
2. When the project is ready, open **SQL Editor → New query**, then paste and **Run** each file **in this order**:
   1. `supabase/migrations/0001_init.sql`
   2. `supabase/migrations/0002_round2.sql`
   3. `supabase/seed.sql` (3 **draft** cards: invisible to the public until Part 4 verifies them in `/curate`)
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

## 3. Hand back to Part 1

Send Part 1 (privately): the production URL, and confirmation that all 7 variables are set for Production + Preview.
Part 1 then runs the live verification:

- RLS on the real database: drafts invisible, verified visible, anon writes denied (`IGNIS_DB_TESTS=1` scoped to a
  deliberately disposable run that cleans up its own rows).
- A `/curate` draft → verify → public-card lifecycle on a throwaway card, deleted afterwards.
- A provider smoke test from Vercel (Groq is expected to work from US infrastructure; Gemini as failover).
- A rate-limit 429 check, an absolute `og:image` / canonical URL, a favicon tab screenshot, and Lighthouse
  (mobile + desktop) on the live URL.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Header says "Catalog not connected" | `SUPABASE_URL` / `SUPABASE_ANON_KEY` missing at build time → set them, redeploy |
| `/api/*` returns `not_configured` | The server-only variable named in the message is missing for that environment |
| `/curate` says "Invalid curator secret" | The value typed doesn't match `CURATOR_SECRET` in that environment |
| Synthesize returns `llm_unavailable` / fallback | Provider key missing or rate-limited; the deterministic evidence-only briefing still renders |
