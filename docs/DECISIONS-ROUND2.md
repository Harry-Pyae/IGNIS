# Round 2 decisions (Part 1, 2026-11-07)

Recorded by Part 1 (team lead) for round 2.
These are team decisions. They override older plan text where noted. The plans themselves are
not rewritten; each affected Build Plan section carries a one-line notice pointing here.

| # | Decision | Affects |
|---|---|---|
| 1 | **The Team Plan supersedes Build Plan §9, §11, §12 and §14** for schedule, ownership and scope tiers. Technical contracts and the Core Principles stay authoritative. | Build Plan §9, §11, §12, §14 |
| 2 | **The Mission Brief and UNTESTED blocks render completely and statically for every user.** The type-in and citation-pop choreography applies only outside Brief blocks (map, cards). Citation chips never press-scale. Enforced by `.motion-still` (Panel adds it to brief tones). This resolves the §8.3 conflict in favor of the guardrail. | Build Plan §8.3, Team Plan Part 3 |
| 3 | **Slider caption everywhere:** "Sliders change which verified NASA experiments IGNIS retrieves." (`COPY.sliderCaption`) | Build Plan §8.1 item 1, §15 item 9 |
| 4 | **Absence copy everywhere:** "No matching verified evidence in the current IGNIS catalog." (`COPY.absence`). Never "what NASA has never tested": a finite curated catalog cannot establish absence across all NASA research. | Build Plan §1, §6, §13; landing and meta copy |
| 5 | **Ownership.** Part 1 owns: `supabase/` schema and migrations, `src/pages/Curate.tsx`, `src/pages/Kit.tsx`, `src/styles/index.css`, `src/lib/catalog.ts` (client catalog integration), the rate-limit guard infrastructure (`src/server/http.ts`), shared contracts and fixtures. Part 4 owns card record content (`supabase/seed.sql` rows, `verified_by`). Part 2 integrates the rate-limit guard into its endpoint logic and extends `src/lib/gates.ts` (one implementation, never forked). | AGENTS.md ownership table |
| 6 | **The boundary polyline is deferred** until Parts 2 and 4 certify a comparable measured series (same material, form, thickness and pressure regime, observed points only). If that can't be defended, drop it using the existing cut order. No interpolated safety region or extrapolation. | Team Plan Expanded Scope |
| 7 | **Node runtime: 24.x everywhere.** `package.json` engines `24.x`, `.nvmrc` = 24, CI reads `.nvmrc`, Vercel picks 24.x from engines. Vitest 5 needs ^22.12 or ^24, supabase-js needs ≥22, ESLint 10 needs ^22.13 or ≥24. Local validation ran on 24.11. | package.json, CI, README |

## Integrity fixes shipped with these decisions

- **Publication = a named human.** The seed rows are drafts (`verified_by = null`). The API and a database check constraint reject blank and placeholder verifier names. `/curate` separates *Save draft* from *Verify & publish*, and saving a published card un-publishes it until someone re-verifies it.
- **Changing conditions** are a typed qualifier (`condition_changes`). GMT45-T4 records its 10 → 2.2 cm/s flow reduction and is never narrated as a constant-flow test. Open question for Part 4: card it with the held flow (current choice), or keep it out of constant-flow comparisons entirely?
- **Claims** carry typed refs `{evidence_id, field, value, unit}`, which are checked against the *cited* card. OBSERVED text is rendered by the server. UNTESTED may only reference server gap ids.
- **Eligibility** is enforced on the server (`src/lib/gates.ts`) before any provider call. Deterministic `CoverageResult` gaps distinguish catalog-wide gaps from values missing only in the top-k.
- **Cache identity** includes `catalog_revision`, the prompt version and the validator version (`src/server/cacheKey.ts`).
- **Extraction** has an allowlisted schema (no verifier or publication fields). Every number needs a quote that is present in the excerpt, and every extraction starts from a clean form.

## What the claim validator guarantees (use this wording in the pitch, no stronger)

> Every observed or supported statement must cite retrieved experiments and list the exact field, value and unit it uses. The server rejects any statement whose numbers, units or outcomes don't match the card it cites. Observed sentences are generated from those checked facts, and gaps come only from a deterministic coverage check.

It does **not** prove that free-form SUPPORTED prose is a correct interpretation. That text is labeled as interpretation.
