# Unified specification — execution status

Updated 2026-11-13. Baseline: `25f3681`. Local implementation authorized by the team lead from
`reports/IGNIS_Unified_Project_Improvement___Execution_Specification.md`. This file supersedes older
status/cut-order rows, not the five scientific principles. No GitHub push before the event days.

## Current implementation versus release readiness

| Surface | Renderer / logic | Content signed | Production verified | QA completed |
|---|---|---|---|---|
| Retrieval, cards, map, Brief, export | Existing; local scientific-clarity/source-navigation fixes added | Latest recorded catalog: 0 verified, 3 drafts; not freshly queried | Historical empty-state checks only; new patch not deployed | Automated result recorded in QA-LOG; real-card acceptance pending |
| Guided mission | Five steps shipped; gate now requires ≥3 distinct verified solid records and a known preset | No reviewed case (`MISSION_CASE = null`) | Unavailable by design | Gate tests; real-user mission pending |
| Card stills | Renderer shipped, context labels retained | No approved ledger entries yet | No new media published | Final asset/mobile review pending |
| Environment inputs | Signed-only renderer shipped; explicit transfer limitation added | Three placeholders remain unsigned | Hidden | Existing gate tests; R1 review pending |
| Research context | Signed-only renderer shipped | Candidate entries remain unsigned | Hidden | Gate tests; scientific review pending |
| Burmese | Draft import guard shipped | Incomplete/unreviewed | English-only | Existing CI guard |
| Duplicate experiment protection | Migration 0004 + curator conflict response prepared | R1 must resolve any existing identity conflict | Not applied remotely | All 16 disposable RLS/lifecycle tests passed; see QA-LOG |

“Implemented” is not “published,” and a test form is not a completed study.

## Specification traceability

| ID | Work delivered locally | Remaining evidence / owner |
|---|---|---|
| P0.1 | [Source queue](sources.md), [coverage record](catalog-coverage.md), duplicate-identity protection, stronger mission gate | R1 extracts/verifies during Nov 14–15; R1/R3 choose ≥3 useful matches and an honest gap. No agent signs for a human. |
| P0.2 | [QA acceptance record](QA-LOG.md), existing runbook, revision/cache tests | A/R3 execute real-card production path and one-shot backup rehearsal after publication. |
| P0.3 | Three-person uncoached protocol and result tables in QA-LOG | R3 recruits actual participants; B fixes the observed top obstacle. |
| P0.4 | Team lead's reported permission and art attribution recorded; current official title linked; [submission checklist](submission-checklist.md) | Original organizer message/scope and local rubric remain documentary evidence, not facts the agent can invent. |
| P1.1 | Map cell explanation; missing-coordinate count also appears with no dots; coordinate/axis distinction; distinct outcome shapes | R1/R3 confirm comprehension on the real mission. |
| P1.2 | Existing aligned fields preserved; class-match/ranking explanation; changing-run notice also appears in map detail and fallback; persistent map/card/citation selection | R1 writes scientific comparability rationale in coverage note. |
| P1.3 | [Eight-query benchmark protocol](retrieval-benchmark.md) and executable offline Vitest harness | R1 supplies real revision-bound scenarios and independently expected IDs. No demo-specific weight tuning. |
| P1.4 | Counterbalanced paired-task protocol and honest reporting template | R3 records actual times, accuracy, and assistance. |
| P1.5 | More restrictive interpretation prompt (`prompts-v5`, invalidates prior prompt cache identity); visible interpretation limitation | R1 audits the real mission Brief. Prompt rules are not proof of semantic correctness. |
| P2 | Existing publication gates retained; source/media review queues prepared | Activate only after P0/P1 and named reviews. Static comparison remains conditional on observed need. |
| §5.1 | Source URLs no longer guessed; source titles and complete recorded locators retained; quote/locator wrapping, focused return to map, non-color markers and stale-input guidance. Catalog failure no longer appears as perpetual loading; public retry preserves inputs. | Default-viewport unavailable/retry behavior checked in browser. Populated-catalog, full viewport/keyboard/reduced-motion inspection and independent comprehension still need evidence. |
| §5.2 | Authoritative status matrix; identity constraint; existing zero-range/class tests retained; cut order updated | Real-catalog ranking/duplicate audit with R1. |

## Deliberate contract clarification

Experiments publish through `/curate`. Environment presets and research context currently publish through
R1's named, sourced review handoff to A, enforced by their existing code gates. The specification's general
“via /curate” sentence does not describe these two existing content stores. This implementation retains those
reviewed stores; it does not silently create a new CMS or fabricate reviewer names. Record any future migration
of these stores as a separate contract change.

## Event release sequence

1. R1 verifies source material inside the event window and prepares the coverage note. Keep conflicting or
   unsupported records unpublished. Exact cable/cargo material names remain unresolved until supported.
2. A applies additive migration 0004 after checking for duplicate campaign/test identities. The index fails on
   existing conflicts; it never deletes records. Do not apply untested schema changes blindly to production.
3. R1/R3 choose and sign a coherent mission; A binds its current verified IDs. The gate checks identity/count/domain
   and that every bound ID is among the preset's current top-5 matches (a later publication that displaces one closes
   the mission until re-review). It does not check scientific comparability or the mission's gap; those are explicit
   human acceptance checks.
4. A/R3 run the real-data path and backup-provider runbook once; destructive lifecycle checks stay disposable.
5. R3 runs unfamiliar-user and paired-source tasks. Record the actual result, fix the highest-impact obstacle,
   then decide whether optional comparison or content adds value.
6. Follow final local submission requirements. GitHub pushes occur only on event days per team lead instruction.

## Data insertion — where each item goes

Everything below is already rendered behind a gate; inserting the signed data is the only remaining step.

| Data | Who signs | Where it goes | Becomes visible when |
|---|---|---|---|
| Experiment cards (incl. `media_url`, `source_section`, `condition_changes`) | R1 (R2 for stills) | `/curate` → publish under own name (production) | Published; catalog revision bumps, cache keys follow |
| Duplicate-identity check, then migration 0004 | A + R1 | `DEPLOY-RUNBOOK.md` §1 read-only query → SQL editor | Query returns no rows |
| Cable / cargo preset material | R1 → A | `SCENARIO_PRESETS` `material` in `src/engine/aliases.ts` (exact `fuel_material` of a verified card) | Next deploy; picker until then |
| Guided mission | R1 + R3 → A | `MISSION_CASE` in `src/engine/mission.ts` (template in its comment) | Gate passes against the live catalog |
| Environment presets / research context | R1 → A | `src/engine/environments.ts`, `src/lib/context-content.ts` (signed fields, `docs/FACT-CHECK-QUEUE.md`) | Signed |
| Coverage snapshot, mission rationale | R1 | `docs/catalog-coverage.md` | — |
| Media provenance | R2 / R1 | `docs/media-ledger.md` | Approved = Yes |
| Retrieval benchmark | R1 → A | Two local JSON files, `docs/retrieval-benchmark.md` | Harness run recorded in QA-LOG |
| Usability / paired-task / acceptance results | R3 | `docs/QA-LOG.md` | — |
| Burmese UI | R3 | `src/i18n/my.draft.ts` + `docs/MY-REVIEW.md` | CI guard passes |

**New cut order (§5.2):** Burmese UI → extra media stills → optional two-card comparison → unsigned environment
presets. Never cut human verification, source traceability, real-data acceptance records, or bounded gap explanations.
The core remains usable with English, text cards, and evidence-only narration fallback.
