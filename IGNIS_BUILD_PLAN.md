# IGNIS — Build Plan

**NASA Space Apps 2026 · Challenge: "Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data"**

This file is the single source of truth for building IGNIS. It is written for Claude Code to execute phase by phase. Read it fully before writing any code. When a decision is ambiguous, the **Core Principles** section wins.

DevNote — LLM providers: all LLM calls are proxied through serverless functions, so in production the request to the provider originates from the hosting platform's servers, not the viewer's browser — a judge's VPN/network situation never affects provider reachability. Dual provider (Groq + Gemini) exists for two reasons only: (a) local development convenience (dev-machine networks in Myanmar reach the two providers differently), and (b) failover resilience against rate limits or outages during the event. It is an ops detail, not a product feature — never pitch "multi-AI" or claim the providers have different capabilities; both are forced through the same prompts and the same Zod validation. See §3 (LLM adapter).
---

## 1. Product Identity

> **Round 2 notice (docs/DECISIONS-ROUND2.md #4):** Absence copy is "No matching verified evidence in the current IGNIS catalog." — never "what NASA has never tested".

- **Name:** IGNIS
- **Subtitle:** Evidence-first fire-safety intelligence for human spaceflight
- **One-sentence pitch:** Describe a spacecraft fire scenario in mission terms and IGNIS retrieves NASA's closest real microgravity combustion experiments, explains what was actually observed, and explicitly shows what NASA has never tested.
- **Core user (for framing):** Astronaut / mission planner assessing material fire risk. Secondary: researchers, spacecraft material designers.
- **The one idea judges must remember:** *IGNIS refuses to guess. It renders the absence of evidence — the untested zones — as a visible, first-class feature.*
- "FlightDeck" is not the product name. It may be used only as a label for the mission-console UI aesthetic/mode if useful. Do not introduce additional product names.

## 2. Core Principles (non-negotiable; these resolve all conflicts)

1. **No prediction, ever.** IGNIS never claims what a flame *would* do. It only reports what NASA experiments *observed*, flags reasonable interpretation, and marks everything else UNTESTED. The word "predict" is banned from UI copy, code comments, and pitch.
2. **Every AI claim is a validated evidence object.** Generated content is returned as structured claims referencing verified experiment IDs and is server-validated before rendering. Claims that cannot be validated are withheld — visibly (see §7.4).
3. **Deterministic before generative.** Retrieval, matching, ranking, coverage, gap detection, and material-alias resolution are pure algorithms over structured data. The LLM only parses scenarios and narrates retrieved evidence.
4. **Scientific domain purity.** MVP retrieval covers **solid-material flammability only** (BASS, BASS-II, Saffire, SoFIE/MIST). SAME smoke-detection experiments carry their own domain (`smoke_detection`) and never enter solid-flammability retrieval. Liquid-droplet combustion (FLEX) is OUT of the MVP entirely and must never be matched against solid scenarios. The domain gate runs before any similarity scoring.
5. **Honesty beats impressiveness.** Missing data stays null and visible. Original units are preserved alongside normalized values. "Unknown", "untested", and "outside current catalog range" are valid, displayed states — and they are distinct states.

## 3. Stack

- **Frontend:** React 18+ + Vite + Tailwind CSS. Charts: Recharts (D3 directly only if Recharts can't do the Evidence Map).
- **Backend/DB:** Supabase (Postgres + REST) **with Row Level Security enabled** (see §10 Security). Simple curator gate for `/curate`, enforced server-side.
- **Validation:** **Zod** on all serverless endpoints that touch LLM output (see §7.5).
- **LLM:** one provider adapter (`llm.ts`) wrapping Groq (primary) and Gemini (fallback) behind a single interface: identical prompts, identical Zod validation, provider order set by env var; on error/timeout the adapter falls through to the next provider and the response is validated the same way regardless of source. Keys live server-side only (serverless function proxy). Model: whatever mid-size instruct model is current on each provider at build time; temperature 0.2 for extraction, 0.3 for synthesis, 0.1 on validation-retry.
- **Deploy:** Vercel (or Netlify) — static frontend + serverless functions `/api/parse-scenario`, `/api/synthesize`, `/api/extract` (curation only), `/api/curate-write` (protected writes).

## 4. Database Schema (Supabase)

Run as SQL migration. One primary table + two small ones.

```sql
create table experiments (
  id uuid primary key default gen_random_uuid(),
  domain text not null default 'solid_flammability'
    check (domain in ('solid_flammability','smoke_detection')),  -- future: 'droplet_combustion'
  campaign text not null,              -- 'BASS' | 'BASS-II' | 'Saffire-I' ... 'SoFIE-MIST' | 'SAME'
  test_id text not null,               -- e.g. 'BASS-II test 17'
  fuel_material text not null,         -- normalized: 'PMMA', 'cotton_fiberglass', 'nomex', ...
  material_class text not null
    check (material_class in ('thermoplastic','fabric','aramid_fabric','insulation','other')),
  fuel_form text not null,             -- 'flat_sheet' | 'rod' | 'fabric' | 'thick_slab'
  thickness_mm numeric,                -- null = not stated
  o2_pct numeric,                      -- normalized volume %
  flow_cm_s numeric,                   -- forced flow velocity
  pressure_kpa numeric,
  ignition_method text,
  outcome text not null check (outcome in ('sustained','extinguished','transition','partial')),
  spread_rate_mm_s numeric,
  key_observation_quote text not null, -- verbatim from source, with original units
  observation_summary text,            -- curator's plain-language summary (1-2 sentences)
  source_title text not null,
  source_url text not null,            -- NTRS or PSI link
  psi_investigation text,              -- e.g. 'BASS' (psi.nasa.gov investigation name)
  source_page int,                     -- all provenance fields nullable; NEVER fabricated
  source_figure text,
  source_table text,
  source_section text,
  ntrs_id text,                        -- when source is NASA Technical Reports Server
  doi text,                            -- only when a DOI actually exists
  media_url text,                      -- NASA footage/still if available
  telemetry jsonb,                     -- optional: {label, x_label, y_label, points: [[x,y],...]} digitized curve
  verified_by text,                    -- curator name; card is PUBLIC only when non-null
  notes text,
  created_at timestamptz default now()
);

create table scenarios_log (          -- optional analytics; harmless
  id uuid primary key default gen_random_uuid(),
  raw_input text, parsed jsonb, created_at timestamptz default now()
);

create table briefings_cache (
  id uuid primary key default gen_random_uuid(),
  scenario_hash text unique, briefing jsonb, created_at timestamptz default now()
);
```

**Verified = `verified_by` is set.** Unverified cards never appear in public UI or retrieval — enforced by RLS (§10), not just by app code. `material_class` is stored explicitly on the record (curator-controlled); the TypeScript alias dictionary (§5a) is a helper, not the source of truth for stored rows.

## 5. Matching Engine (pure TypeScript, no LLM)

Pipeline: **alias resolution → hard eligibility gates → weighted similarity → ranked list with parameter chips.**

### 5a. Material Alias Resolver (deterministic, runs before gates)

A controlled TypeScript map translating mission language into catalog materials/classes. Two separate dictionaries — never merged:

- **Material aliases** (safe, deterministic): `"flight suit" → nomex (aramid_fabric)`, `"astronaut clothing" → cotton_fiberglass (fabric)`, `"cable jacket" / "wiring insulation" → <catalog insulation material> (insulation)`.
- **Mission-scenario aliases** resolve to a material ONLY via an explicit scenario preset definition (e.g., the *Cabin Wall Panel* preset itself declares `PMMA / thermoplastic`). A bare phrase like "cabin wall" or "window hatch" outside a preset must NOT auto-become PMMA.

Rules: resolution is shown in the UI (`Resolved: "flight suit" → Nomex / aramid fabric`); unknown or ambiguous terms render `Material unresolved — select a catalog material` with a picker; the system never silently guesses, and the LLM is never used for the final catalog-material classification (it may pass through the raw user phrase for the resolver to handle).

### 5b. Gates and similarity

```
Stage 1 — Eligibility gates (boolean filters):
  - experiment.domain === scenario.domain          (always 'solid_flammability' in MVP;
    'smoke_detection' (SAME) and any future domain NEVER pass this gate for solid scenarios)
  - fuel compatibility: exact fuel_material match OR same material_class (from the stored column)
  - fuel_form compatible (sheet~slab allowed; fabric≠rod)

Stage 2 — Similarity over survivors:
  For each continuous param p in [o2_pct, flow_cm_s, pressure_kpa, thickness_mm]:
    if scenario[p] == null or experiment[p] == null → status 'untested', EXCLUDED from score
    else d = |scen − exp| / range(p across catalog); contribution = 1 − min(d, 1)
  score = Σ(w_p × contribution) / Σ(w_p over scored params)
  weights: o2 0.35, flow 0.30, thickness 0.20, pressure 0.15
  Exact fuel material match adds flat +0.10 bonus (cap 1.0).
  Additionally compute per-param range check: if scenario[p] is outside
  [min, max] of that param across gate-surviving catalog → flag 'outside_catalog_range'.
  Do NOT clamp the value; do not alter the score formula for it.

Stage 3 — Output per match:
  { experiment,
    chips: {fuel:'exact'|'class', o2:'same'|'close'|'different'|'untested'|'outside_range', ...},
    scoredParams, score }
  chip thresholds: same ≤5% of range, close ≤20%, different >20%.
```

### 5c. "Why this matched" (public explanation)

The numeric score is **internal sort order only** — never displayed. Each match renders a deterministic block generated directly from Stage 2/3 output (never by the LLM):

```
WHY THIS MATCHED
✓ Material: exact
✓ Oxygen: same
≈ Airflow: close
⚠ Thickness: not reported
∅ Pressure: untested
```

Primary summary line stays: **"Matched N of M parameters."** Minimum 1 scored continuous param required, else the match is labeled "weak evidence — material match only".

### 5d. Outside-catalog-range state (distinct from untested)

- **UNTESTED:** no relevant verified coverage for that parameter/combination.
- **OUTSIDE CURRENT CATALOG RANGE:** the user's value falls beyond the min/max the verified catalog covers (e.g., O₂ 32% when the catalog spans 14–26%).
These render differently (∅ vs ⇥ chip + distinct copy) and are never conflated. UI copy: "Your value is outside the range NASA's verified solid-flammability catalog currently covers — IGNIS cannot cite evidence here." Never imply outside-range = dangerous; never clamp silently.

## 6. Gap Detection (deterministic)

> **Round 2 notice (docs/DECISIONS-ROUND2.md #4):** Gap copy is bounded to the current IGNIS catalog (`COPY.absence`, `COPY.gapNote`); per-parameter coverage is the typed `CoverageResult`.

- Grid the (o2_pct × flow_cm_s) plane into cells (suggested: o2 1%-steps 14–30, flow 2 cm/s-steps 0–30).
- A cell is **tested** if ≥1 verified experiment falls in it (after gates for the currently selected material class, or globally when no scenario is active).
- Untested cells render as hatched/dim shading on the Evidence Map; regions beyond the catalog's min/max envelope render with the distinct outside-range treatment (§5d).
- **Copy rule (must appear in UI):** "Untested regions are not necessarily unsafe — they are unstudied. IGNIS marks them as candidate areas for future NASA testing."
- Side panel "Evidence Gap Radar": top 5 largest contiguous untested regions + materials with <3 verified experiments, listed as research-prioritization suggestions.

## 7. AI Usage (strict boundary)

### 7.1 Deterministic (never LLM)
Filtering, gates, alias resolution, parameter matching, ranking, chips, "why matched" blocks, coverage counts, gap grid, outside-range detection, statistics, JSON export.

### 7.2 LLM Job A — Scenario parsing (`/api/parse-scenario`)
Input: free text or template selection. Output: strict JSON `{domain, fuel_material_raw, fuel_form, thickness_mm, o2_pct, flow_cm_s, pressure_kpa}` with nulls for anything unstated. `fuel_material_raw` is the user's phrase — the deterministic resolver (§5a) maps it to a catalog material, or asks the user. The parsed chips (including the alias resolution) are shown to the user for correction BEFORE matching runs (review-before-save pattern).

### 7.3 LLM Job B — Briefing synthesis (`/api/synthesize`) — structured claims, not tagged prose
Context = ONLY the top-k (k≤5) retrieved verified cards, serialized with stable IDs (`E1`..`Ek`). The model must return a JSON briefing:

```json
{ "claims": [
    { "classification": "OBSERVED",
      "text": "BASS-II test 17 sustained burning at 19% O2 under low forced flow.",
      "evidence_ids": ["E3"] },
    { "classification": "SUPPORTED",
      "text": "Across the three matched tests, lower flow coincided with weaker flames.",
      "evidence_ids": ["E1","E3","E4"] },
    { "classification": "UNTESTED",
      "text": "No matched experiment reports behavior at the scenario's pressure.",
      "evidence_ids": [] } ] }
```

Rules: every OBSERVED and SUPPORTED claim must reference ≥1 evidence ID; every referenced ID must exist in the exact retrieved context; UNTESTED claims identify missing evidence but must not invent explanations; forbidden content: numbers absent from the cards, the words "predict"/"will"/"would burn". The UI renders OBSERVED / SUPPORTED INTERPRETATION / UNTESTED sections from `classification`, and renders citation chips from `evidence_ids` — the chips are a UI projection of validated structure, not the integrity mechanism itself.

### 7.4 Server-side claim validation (code, small)
Pipeline per response: Zod-parse the JSON shape → check every `evidence_ids` entry against the retrieved context IDs → reject the response on malformed JSON, bad enum, bad types, or unknown evidence IDs → retry once at temperature ≈0.1 → claims that still fail are **withheld**, and the UI shows a visible "N statements withheld (failed evidence validation)" badge. The badge is a feature, not an error — it is part of IGNIS's evidence-integrity story; mention it in the pitch. If the whole response fails twice, render a controlled fallback ("Briefing unavailable — showing matched evidence only") rather than crashing; the deterministic match panel still carries the demo.

### 7.5 Zod validation (all LLM JSON)
- `/api/parse-scenario`: schema for `{domain, fuel_material_raw, fuel_form, thickness_mm, o2_pct, flow_cm_s, pressure_kpa}`, nullable where appropriate; numeric bounds sanity-checked (o2 0–100, flow ≥0, etc.).
- `/api/synthesize`: schema for the briefing structure: `claims[]` with `classification ∈ {OBSERVED, SUPPORTED, UNTESTED}`, non-empty `text`, `evidence_ids` string array.
- Same retry-once-at-low-temp rule; fail safely with a controlled fallback. Do not over-engineer the retry system.

### 7.6 LLM Job C — Extraction (curation only, `/api/extract`)
System prompt: schema with field descriptions + rules: only explicitly stated values; null otherwise; every numeric field must carry a verbatim quote with original units; no unit conversion (curator does that); provenance fields (page/figure/table/section, ntrs_id, doi) only when explicitly visible in the source — never guessed. One worked example (a BASS test), then the pasted paper excerpt. Output drafts into the curation queue, never directly public.

## 8. UI — Pages & Components

### 8.1 Public app (single page, mission-console aesthetic)

> **Round 2 notice (docs/DECISIONS-ROUND2.md #3):** Slider caption is "Sliders change which verified NASA experiments IGNIS retrieves." (`COPY.sliderCaption`).
Dark theme, amber/orange accents on near-black, monospace labels for parameter readouts; think flight console, not SaaS dashboard. Layout top-to-bottom:

0. **Provenance strip (header):** `XX verified experiments · X NASA campaigns · NTRS / PSI sources` — click expands a compact panel listing campaigns with source links. Reinforces "curated evidence catalog, not generated knowledge." No separate documentation portal.
1. **Scenario Builder** — template cards: *Cabin wall panel (PMMA)*, *Cable insulation*, *Crew clothing (cotton blend)*, *Cargo packaging*, *Custom*. Presets carry their explicit material mappings (§5a). Selecting fills editable parameter chips; free-text input shows the alias resolution line or the "material unresolved" picker. Two live sliders: **O₂ % (14–30)** and **Airflow (0–30 cm/s)**.
   - **Slider semantics (critical):** moving a slider moves the scenario marker on the Evidence Map and re-runs deterministic retrieval live (debounced 150 ms). It changes WHICH evidence is shown. It never paints predicted-risk zones. No red "danger zone" overlays except actual experiment outcome dots. If a slider leaves the catalog envelope, the outside-range state (§5d) appears — no clamping.
2. **Evidence Map (signature visual)** — Recharts scatter: x = flow_cm_s, y = o2_pct. Dots = verified experiments, color by outcome (sustained = orange, extinguished = blue, transition = violet). Pulsing white marker = current scenario. Lines connect marker to top-3 matches. Hatched shading = untested grid cells; distinct treatment beyond the catalog envelope. Hover dot → mini card. This chart must be beautiful; budget real time on it.
3. **Match Panel** — top 3–5 cards: campaign/test id, chips row + WHY THIS MATCHED block (§5c), outcome badge, spread rate, thumbnail (media_url), source link with provenance when available. Optional telemetry sparkline if `telemetry` present; click → modal with full curve (axes labeled, "digitized from [source]" caption).
4. **Mission Brief** — OBSERVED / SUPPORTED INTERPRETATION / UNTESTED sections rendered from validated claims (§7.3). Citation chips → click → scrolls/highlights the evidence card → card shows the exact `key_observation_quote` + provenance line + source link. **Evidence Chain format when provenance exists:** `[E3] BASS-II Test 17 · p.12 · Table 4 · NTRS` (omit unknown parts; never fabricate). Withheld-statements badge when applicable.
5. **Evidence Gap Radar** — the gap list + one-line research-prioritization framing.
6. **Header, top-right:** `[⬇ Export Open Dataset (.json)]` — downloads all verified cards (including provenance fields) as clean JSON with a tiny schema README embedded. Position it as **"a traceable, structured research catalog with NASA source provenance"** — do NOT call it "publication-ready".
7. **Guided Demo (Judge Mode)** — a "Run the guided demo" button prominent on first load. Clicking it auto-executes the rehearsed cabin-wall scenario end to end: scenario fills in, Evidence Map animates, matches appear, Mission Brief renders from `briefings_cache` — with a short caption at each step ("These dots are real NASA burn tests." / "The hatched area is what NASA has never tested."). Below it, 2–3 one-click preset scenarios judges can try themselves. Purpose: judges reviewing the deployed URL asynchronously, with nobody presenting, must hit a self-guiding golden path within five seconds. Reuses presets, the demo-scenario rule (§13), and the briefing cache — no new backend.

### 8.2 `/curate` (internal, server-side protected)
Paste paper text/table → Extract (LLM draft) → side-by-side: draft fields (editable, including material_class and provenance fields) vs pasted source + source URL field → curator fixes units/nulls → `[Verify & Publish]` sets `verified_by` via the protected server route (§10). Also: manual-entry blank form (papers with tables are often faster typed by hand than extracted). Keep this page ugly-but-fast; it is not judged.

### 8.3 Visual design language (build to this, not from scratch)

> **Round 2 notice (docs/DECISIONS-ROUND2.md #2):** The Mission Brief and UNTESTED blocks render completely and statically; the type-in / chip-pop choreography applies only outside Brief blocks.

The approved look lives on the design canvas "IGNIS product mockups" (dashboard + landing boards) — replicate it; do not invent a new aesthetic. Tokens and rules:

- **Color tokens:** bg `#0C0F16` · panel `#131824` · border `#232B3A` · raised/matched border `#3A4663` · text `#E8EAF0` · dim `#9AA3B5` · faint `#6E7891` · accent amber `#F5A623` · flame orange `#F97316` (sustained) · blue `#4C8DFF` dot / `#2F6BD8` badge (extinguished) · violet `#A78BFA` dot / `#7C5CDB` badge (transition) · success green `#7FD08A` · warn `#E8C468`. Brief blocks: OBSERVED `#15201A`/`#2E4A36`, INTERPRETATION `#161D2C`/`#3A4663`, UNTESTED `#241D10`/`#6B5620`.
- **Type:** Space Grotesk for UI; IBM Plex Mono for console labels, parameter readouts, chips, and tickers — uppercase with 1–2px letter-spacing. Section headers follow the pattern `MISSION SCENARIO` + mono step tag `01 · DESCRIBE`, `02 · RETRIEVE`, `03 · WHY THESE`, `04 · EVIDENCE-VALIDATED CLAIMS`, `05 · RESEARCH PRIORITIZATION`.
- **Surface & depth:** 16px-radius panels on a near-black ground; starfield as layered radial-gradient dots; one radial depth gradient from top-right; two blurred aurora glows (flame orange top-right, violet mid-left; ~95px blur, 0.15 opacity, 20s drift) behind all content.
- **Components:** pill preset chips (active = amber border); parameter chips with the fixed symbol language ✓ same/exact (green), ≈ close (warn), ⚠ not reported (dim), ∅ untested (faint), ⇥ outside catalog range; outcome badges; bordered amber citation chips `[E3]`; light floating annotation chip over the dark map ("3 MATCHED TESTS · 1 UNTESTED PARAMETER"); telemetry ticker strip of experiment IDs under the header; blinking LIVE RETRIEVAL indicator; provenance pill in the header.
- **Motion inventory (CSS, exact timings from the mockup):** radar sweep across the plot, 8s linear, clipped to plot bounds, amber fading trail · scenario-marker pulse rings, 2.4s ease-out, two rings staggered −1.2s · match-line marching ants, 1.2s linear · flame-dot flicker on sustained matches, 2.6s staggered · ticker 30s linear loop · guided-demo button glow, 2.6s · aurora drift 20s · card hover lift 0.25s + amber border.
- **Motion restraint rules (as important as the motion):** nothing loops faster than 1.2s; the overall feel is calm NASA ops room, never casino. ZERO animation inside the Mission Brief and UNTESTED blocks — the credibility moments stay still. Wrap all animation in `@media (prefers-reduced-motion: no-preference)` so reduced-motion users get a static console.
- **Live choreography (real app only, Phase 5):** on load, map dots stagger in (~20ms apart), gap hatching draws last so absence-of-evidence visibly appears; on slider drag, the scenario marker glides (~300ms ease), match lines re-snap, match cards crossfade; on briefing arrival, claims type in line-by-line and each citation chip pops on only after server validation passes. This drag→glide→re-match→retype sequence is the demo climax — budget real Phase 5 time for it.

## 9. Data Strategy (first 24 hours, content team)

> **Round 2 notice (docs/DECISIONS-ROUND2.md #1):** Schedule and targets are superseded by IGNIS_TEAM_PLAN.md (7-day plan). The verification rules here still apply.

- **Sources, priority order:** (1) BASS / BASS-II results papers on NTRS (tabulated burn tests — richest extraction target), (2) Saffire I–IV summary reports (large-scale, best footage, clear outcomes), (3) SoFIE/MIST recent results, (4) SAME cards optionally, stored under domain `smoke_detection` for context display only — they never enter solid-flammability retrieval. PSI (psi.nasa.gov) investigation pages are the authoritative `source_url`/`psi_investigation` anchors; NTRS PDFs are the extraction substrate (record `ntrs_id`; record `doi` only when one exists). FLEX/droplets: collect links for the roadmap slide only — do not card them.
- **Targets:** 15 verified cards by end of hour 12 (minimum viable demo), 30 by hour 24 (comfortable), 40 = stretch. 3 curators × ~10 cards each is realistic with the curation view.
- **Verified means:** every non-null field checked against the source by a named curator; quote verbatim; original units preserved in quote; normalized SI values in columns; deterministic, curator-controlled normalization; anything ambiguous → null + note; provenance (page/figure/table) recorded only when actually seen in the source.
- **Data integrity rule (applies to every entry path):** thin verified evidence beats rich unverified evidence. Every non-null scientific value must have a source; ambiguity becomes null, never a guess; LLM extraction is a drafting tool only; curator verification is required before public retrieval.
- **Telemetry (should-have):** for 3–5 standout cards, digitize one curve (temperature vs time, or spread rate vs flow) from a paper figure using WebPlotDigitizer; store as `telemetry` JSON. Skip entirely if behind schedule.
- **Biggest data risk:** extraction perfectionism. Rule: timebox 20 min/card; park hard ones.
- **Space Apps compliance:** collect source lists before the event; do extraction/verification DURING the event window.

## 10. Security (hackathon-proportional, but real)

- **Supabase RLS enabled.** Public (anon) policy: `select` on `experiments` only where `verified_by is not null`. No public insert/update/delete on any table. Unverified rows are invisible to the public API, not merely unrendered.
- **Writes go server-side:** `/api/curate-write` (and `/api/extract`) run with the service-role key on the server; the service-role key and the LLM provider keys (Groq, Gemini) never reach the browser; the provider adapter runs server-side only.
- **`/curate` protected server-side:** the write endpoints require a shared curator secret (env var) checked on the server; hiding the route in the frontend is not the protection.
- **Lightweight rate limiting** on `/api/parse-scenario` and `/api/synthesize` (e.g., simple per-IP counter in memory/KV) — enough to defend in Q&A.
- Do not build enterprise auth, user accounts, or roles. Security must be explainable in one Q&A answer: "RLS allows public reads of verified rows only; all writes and AI calls are server-side with secrets in env."

## 11. Scope Tiers (ruthless)

> **Round 2 notice (docs/DECISIONS-ROUND2.md #1):** Tiers are superseded by the Team Plan's Expanded Scope + cut order; boundary polyline deferred (#6).

**MUST HAVE (demo dies without):** 15+ verified cards · Scenario Builder with templates + editable chips · parse-scenario with user confirmation · deterministic material-alias resolution with visible "Resolved:" line · matching engine with gates + chips + WHY THIS MATCHED · Evidence Map with outcome dots + scenario marker + match lines · Mission Brief from validated structured claims + Evidence Chain click-through · UNTESTED state (and outside-range state distinct) · provenance strip · Export Dataset button · RLS + server-side secrets · deployed public URL.

**SHOULD HAVE:** live sliders with real-time re-retrieval · gap-grid shading on the map · Gap Radar panel · media thumbnails on cards · 30 cards · briefing cache · provenance fields filled on most cards · Guided Demo (Judge Mode) button with one-click preset scenarios.

**WOW IF TIME ALLOWS:** auto-play step captions on the Guided Demo · telemetry sparklines/modal (3–5 cards) · comparison animation when switching scenarios · flammability boundary polyline drawn only through actual data points (never beyond data extent) · bilingual (Burmese) UI toggle for local-event flavor · trivial read-only client cache of verified cards as a resilience fallback (performance optimization only — never pitched as offline/crew-hardware readiness; stale cache must never override current server data or expose unverified rows).

**DO NOT BUILD:** any predicted-risk overlay or simulator · free-chat over the corpus · user PDF upload · droplet domain · 3D flame graphics · accounts/auth beyond the curator secret · full offline/PWA infrastructure or "runs 100% locally on crew hardware" claims (roadmap slide only: "catalog is ~200 KB; architecture is designed to be deployable on crew hardware") · real-time PSI API integration · LLM-generated match explanations.

## 12. Build Phases (for Claude Code execution)

> **Round 2 notice (docs/DECISIONS-ROUND2.md #1):** Phases and hours are superseded by the Team Plan timeline.

**Phase 0 — Scaffold (≤1 h):** Vite+React+Tailwind init; Supabase project + migration from §4 **+ RLS policies from §10**; env wiring (secrets server-side only); serverless function stubs; deploy pipeline green with a hello page.
**Phase 1 — Curation path (hours 1–4):** `/curate` page (manual form first, LLM extract second) writing through the protected server route; seed 3 hand-made cards from a BASS paper to unblock frontend work immediately.
**Phase 2 — Matching + Evidence Map (hours 4–12):** alias resolver with its dictionaries; matching module (gates → similarity → chips → outside-range flags) with unit tests on the 3 seed cards; Evidence Map and Match Panel built to the §8.3 tokens/components (static first, no motion yet).
**Phase 3 — AI layer (hours 12–18):** `llm.ts` provider adapter (Groq primary, Gemini fallback, env-ordered) with one smoke test per provider; parse-scenario with Zod + confirmation UI; synthesize returning structured claims + Zod + evidence-ID validation + retry-at-0.1 + withheld badge; Mission Brief UI with Evidence Chain interaction.
**Phase 4 — Honesty layer (hours 18–24):** UNTESTED and outside-range rendering; gap grid + shading; Gap Radar; provenance strip; Export button.
**Phase 5 — Polish (hours 24–36):** sliders with live re-retrieval + the §8.3 live choreography (marker glide, re-snap, typed briefing with validated chips); the §8.3 motion inventory with its restraint rules and prefers-reduced-motion guard; Guided Demo (Judge Mode) button + preset scenarios (captions if time); thumbnails; telemetry if on schedule; empty/error states + controlled fallbacks; demo scenario tuning (see §13).
**Phase 6 — Freeze (hours 36–48):** content freeze; record backup demo video; rehearse; bug-fix only.

Acceptance test after Phase 4: a teammate who hasn't seen the app can run the cabin-wall scenario and explain the UNTESTED section unprompted — and a dev can answer "how do you stop hallucination?" in one sentence: *"The model returns structured claims; the server rejects any claim whose evidence IDs aren't in the retrieved context."*

## 13. Demo (2.5 min) + Failure Fallback

> **Round 2 notice (docs/DECISIONS-ROUND2.md #4):** The UNTESTED line becomes "IGNIS tells you what NASA saw — and refuses to guess where the current catalog has no matching verified evidence."

Script beats: Earth candle vs BASS flame sphere footage (0:00–0:20) → "20 years of NASA fire research, unsearchable at 2 a.m." with scattered-papers visual (0:20–0:35) → live: pick *Cabin wall panel* template, parsed chips + resolution line confirmed (0:35–0:50) → **slider moment:** drag O₂ 21→25 %, marker glides, new experiments light up live (0:50–1:15) → Match Panel: three real tests, WHY THIS MATCHED chips, footage stills (1:15–1:35) → Brief renders from validated claims; click a citation chip → quote → `p.12 · Table 4 · NTRS` → source (1:35–1:55) → linger on amber UNTESTED box; line: *"IGNIS tells you what NASA saw — and refuses to guess what NASA never tested."* (1:55–2:10) → zoom out to hatched gap zones: "the gaps are a research roadmap for Artemis" + Export button beat (2:10–2:25) → close card (2:25–2:30).
**Demo-scenario rule:** choose the demo scenario FROM the finished catalog so it yields ≥3 strong matches and exactly one clean gap. **Async judging:** the same rehearsed flow is available to judges on the live URL via the Guided Demo button (§8.1 item 7). **Fallback:** pre-recorded 1080p screen capture of the identical flow, synced to the same VO; cache the demo briefing in `briefings_cache` so even the live run needs no cold LLM call; if synthesis fails live, the deterministic match panel + "showing matched evidence only" fallback still demos.

## 14. The Six Workstreams (each has one owner; pick at the kickoff meeting)

> **Round 2 notice (docs/DECISIONS-ROUND2.md #1):** This numbering is obsolete. Ownership follows IGNIS_TEAM_PLAN.md (Part 1 = Foundation & Integration) and AGENTS.md.

IGNIS splits into six self-contained parts. Every part has a clear mission, its own deliverables, and minimal blocking on the others — the two engineering parts (1–2) run in parallel with the three content parts (3–5) from hour one, and Part 6 ramps up as the build stabilizes. Five people, six parts: whoever ends up with two takes the pairing noted on their first pick.

**Part 1 — The Evidence Engine** *(for whoever wants to own the brain)*
Supabase schema + RLS, the alias resolver, the gates→similarity→chips matching engine, the LLM adapter (Groq primary, Gemini failover), Zod + structured-claim validation, the export endpoint. Deliverable: a judge can ask "how do you stop hallucination?" and this person answers in one sentence. Pairs with: Part 6 Q&A drilling.

**Part 2 — The Mission Console** *(for whoever wants to own what judges see)*
The React frontend built to §8.3: Evidence Map, Match Panel, Mission Brief with Evidence Chain, provenance strip, curate UI, the full motion inventory with its restraint rules. Deliverable: the live app matching the approved mockup boards. Pairs with: Guided Demo implementation in Part 6.

**Part 3 — The Evidence Catalog** *(for whoever wants to own the science)*
Chief curator: the verification QA on every card, the normalization decisions, provenance capture (page/figure/table, NTRS id), and the "can we defend every number" check. Deliverable: 15 verified cards by hour 12, 30 by hour 24 — every one traceable. Pairs with: Part 4 (same workbench, split by campaign).

**Part 4 — Source Intelligence** *(for whoever wants to own the hunt)*
NASA source scouting (BASS/BASS-II NTRS papers, Saffire reports, SoFIE/MIST), feeding the extraction queue, card data entry, telemetry curve digitization if on schedule. Deliverable: the raw material Part 3 verifies, flowing from hour one with zero dev-blocking. Pairs with: Part 3.

**Part 5 — The Broadcast** *(for whoever wants to own the film)*
NASA footage pull (public domain: BASS flame spheres, FLEX cool flames for the hook only, Saffire burns), visual identity assets, the 2.5-minute pitch video capture + edit, VO recording. Hard rule: product UI fills ≥50 % of the final video runtime. Deliverable: the backup video that can win even if the live demo dies.

**Part 6 — Demo Direction & Judge Experience** *(for whoever wants to own the room)*
The live demo script and its rehearsal direction, the VO/presenter delivery, Guided Demo (Judge Mode) copy and captions, the demo-scenario selection per §13's rule, and Q&A drilling for the whole team — especially the three rehearsed lines: the UNTESTED one-liner, the hallucination answer, and the security answer. Deliverable: two full rehearsals before freeze, timed under 2:30.

## 15. Top Failure Modes → Mitigations

> **Round 2 notice (docs/DECISIONS-ROUND2.md #3):** Item 9 caption is replaced by `COPY.sliderCaption`.

1. Too few clean cards → manual-entry-first curation, thin-card rule, 12 h checkpoint (if <10 cards, cut telemetry + reduce templates to 2).
2. LLM evidence drift → structured claims + Zod + server-side evidence-ID validation + low-temp retry + visible withheld badge (feature-ize the failure).
3. Demo scenario lands in a dead zone → §13 demo-scenario rule.
4. "It's just RAG over PDFs" perception → lead pitch with deterministic map, gates, and WHY THIS MATCHED; the LLM appears last and returns validated objects, not prose.
5. Invalid cross-domain comparison → domain gate before scoring; SAME confined to `smoke_detection`; no FLEX cards in DB.
6. API outage on stage → provider adapter fails over Groq→Gemini automatically + cached briefing + evidence-only fallback + backup video.
7. UI overload → single-column narrative layout (§8 order), details behind hovers/clicks.
8. Extraction time sink → 20-min/card timebox.
9. Slider misread as simulator → on-screen caption near slider: "Slider changes which NASA evidence is retrieved — IGNIS does not predict behavior." Outside-range state appears instead of clamping.
10. Judges miss the point → the UNTESTED amber box and the one-liner are rehearsed verbatim; provenance strip visible from the first frame.

## 16. Switch-to-Mars Triggers (decide at prep checkpoints, not on vibes)

Abandon IGNIS for Martian Map only if: (a) <10 verifiable cards after one focused prep day on BASS/Saffire papers; (b) local judging confirmed as public-vote/non-technical-heavy; (c) no team member can defend a sampled card's numbers after a week of reading; (d) two consecutive outside-viewer demo rehearsals fall flat while a Mars mock excites. Mars's only unreproducible advantage is innate planetary spectacle; IGNIS's unreproducible advantage is defensibility under expert questioning. If none of (a)–(d) fire, build IGNIS.
