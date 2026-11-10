# IGNIS — development timeline and disclosure

**Team AstroFlare · NASA Space Apps Challenge 2026 · Challenge: "Flame in Freefall"**
**Status:** written 2026-11-10 as the basis of our request for an organizer ruling. Updated when the ruling arrives.

This is a plain statement of what our team built and when, so anyone can check it against the public git history
(<https://github.com/Harry-Pyae/IGNIS>).

## Dates

| | |
|---|---|
| Challenge statements published | 2026-10-28 (Space Apps schedule) |
| Repository created (public) | 2026-11-07 |
| **Preparation phase** | **2026-11-07 → 2026-11-13** (before the official start) |
| First commit | `cf24fa5`, 2026-11-07 19:09 (UTC+06:30) |
| Last commit when this was written | `3d257b0`, 2026-11-10 17:42 (UTC+06:30), 62 commits on `main` |
| **Official event window** | **2026-11-14 → 2026-11-15** (Participant Terms) |

## The rule we're asking about

The 2026 Participant FAQ says: *"Teams are not allowed to begin working on the challenges prior to the hackathon."*
Our preparation work is **specific to the Flame in Freefall challenge**, not generic scaffolding, so we are disclosing it
and asking the organizers how to proceed. We'll follow their ruling.

## What we built before the event

All of this is in the git history with its dates.

- **App foundation:** Vite + React + TypeScript project, CI, deployment on Vercel, a Supabase database schema with
  row-level security, design tokens and UI components, a landing page.
- **Evidence engine** for this challenge: material-name resolution, eligibility gates limited to solid-material
  flammability (BASS, BASS-II, Saffire, SoFIE/MIST), similarity matching with explanation chips, untested and
  outside-range states, a gap grid and gap radar.
- **LLM layer:** scenario parsing and briefing synthesis through Groq (primary) and Google Gemini (backup), with every
  response schema-validated and every claim checked by the server against the experiment it cites. Prompts include a
  worked BASS extraction example.
- **Curation tool** (`/curate`): manual entry, LLM-drafted extraction, and publication only under a named human reviewer.
- **Mission console:** scenario builder, evidence map, match panel, mission brief and gap radar.
- **Tests:** 184 automated tests, plus database security and curation-lifecycle tests on a throwaway database.

## NASA data handled before the event

- **Three draft cards** were extracted on 2026-11-07 from one NASA Technical Reports Server paper (NTRS 20150008962,
  BASS/BASS-II tests GMT96-T7, GMT96-T8 and GMT45-T4) to test the database and engine. They are stored as
  **unpublished drafts** (`supabase/seed.sql`, no reviewer, invisible to the public), and the same values appear in test
  fixtures (`src/lib/fixtures.ts`).
- **No card has been verified or published.** The public catalog has **0 verified cards**.

## What happens only during the event window

- All card extraction, verification and publication (including re-verifying the three drafts from the source).
- Choosing the demo case from the real verified catalog, and writing the guided-mission captions.
- Warming the briefing cache for the demo case; the end-to-end checks on real cards.
- Rehearsals, the pitch video, the usability test and the submission.
- New feature code, depending on the organizers' ruling.

## Use of AI ("Super Intelligence") tools

- **Development:** an AI coding assistant (Claude Code, by Anthropic) wrote most of the code under the team lead's
  direction. The team lead reviewed, tested and merged every change.
- **In the product:** Groq-hosted `openai/gpt-oss-120b` (primary) and Google Gemini `gemini-3.5-flash-lite` (backup)
  turn a typed scenario into structured fields, which the user confirms, and narrate retrieved evidence as structured
  claims that the server validates. They also draft card extractions that a named human verifies before anything is
  published. The LLMs never classify materials, rank matches or explain matches; that is deterministic code.
- **Branding art** (`public/art/*`): AI-generated illustrations made with **[tool name — team lead to fill in]**. They
  are used for branding only, never as experiment data, and the flame illustration is captioned
  "Illustration — not NASA experiment imagery."

## Third-party components and credits

| Component | Use | License |
|---|---|---|
| React, React DOM | UI | MIT |
| Zod | Schema validation | MIT |
| @supabase/supabase-js | Database client | MIT |
| Supabase (hosted Postgres) | Database | Hosted service |
| Vite, @vitejs/plugin-react, Vitest | Build and tests | MIT |
| Tailwind CSS | Styling | MIT |
| TypeScript | Language | Apache-2.0 |
| ESLint, typescript-eslint | Linting | MIT |
| Space Grotesk, IBM Plex Mono | Fonts (self-hosted) | SIL Open Font License 1.1 (license files in `public/fonts/`) |
| Vercel | Hosting and serverless functions | Hosted service |
| Groq API (`openai/gpt-oss-120b`), Google Gemini API | LLM calls | Hosted services; not redistributed |
| NASA Technical Reports Server, NASA Physical Sciences Informatics | Experiment sources | Each card cites its source, page and locator, quoting short excerpts |
| NASA imagery (when added) | Card stills | Recorded with origin and credit in the media ledger, following NASA's media usage guidelines |

**Project license:** not chosen yet. Under the Participant Terms, original content without a stated OSI license is
distributed under Apache-2.0.
