# Round 3 decisions (Coder A, 2026-11-09)

Recorded by Coder A (team lead) after the round-3 review ("IGNIS next improvements review", 9 November 2026, checkout
`249ba74`) and its three research notes (engineering, design, decisions/data). The review was a vetted input; it is kept
unedited by the team lead outside the repository, and this file carries everything the team acts on: its findings as
shipped below, and the team's rulings on its proposals. Round 2 decisions (`docs/DECISIONS-ROUND2.md`) stand unless
noted.

| # | Decision | Affects |
|---|---|---|
| 1 | **UI copy is catalog-bounded everywhere** (reaffirms Round 2 decision 4): absence is "No matching verified evidence in the current IGNIS catalog.", never a claim about all NASA research. The landing line "anything unsupported is withheld" is replaced by wording that matches the documented guarantee (failed statements are withheld; interpretation stays labeled). | All product copy, landing |
| 2 | **The spoken/pitch one-liner "IGNIS never predicts" is kept.** The review's proposed narrowing ("IGNIS shows what NASA observed—and where the current catalog has no matching verified evidence") applies to **product copy**, not the verbal brand line. The no-"predict" rule for UI copy, code comments and written material is unchanged. | Pitch (R3), UI copy |
| 3 | **Review §3 (wireframes, mark semantics, state table) goes to Coder B as input, not commitment.** B decides the console layout within Build Plan §8 and the Round 2 decisions. | Coder B |
| 4 | **Review §4's estimates are planning aids**, not commitments or new scope. The Team Plan's cut order and DO-NOT-BUILD list still govern. | Planning |
| 5 | **Review §5's source order goes to R1** (seed sign-off → complete BASS-II runs → Saffire I/II/IV → obtainable MIST papers), as an acquisition order, not a promised card yield. | R1 |
| 6 | **R2: a correctly associated, ledgered still beats thumbnail count.** Campaign imagery without a verified test association is labeled "campaign context". | R2 |
| 7 | **Async Brief + revision binding is Coder B's contract.** Every Brief request is tagged with its scenario and `catalog_revision`. Late responses never overwrite current results; synthesis follows confirmed or settled input, not every slider frame (deterministic retrieval may follow sliders). Coder A guarantees the other half: every `/api/synthesize` response carries `catalog_revision` and an `evidence` array mapping each positional `E1..Ek` label to a stable experiment UUID, so citation targets resolve through that response only. | Coder B console, Coder A API |
| 8 | **Canonical airflow parsing:** "still air", "quiescent" or "no ventilation" parses as `flow_cm_s: 0` (a stated zero); no airflow mention at all parses as `null` (unstated). One rule in the single parse prompt every provider receives (`PARSE_SCENARIO_SYSTEM`, `prompts-v4`), with worked examples rendered from `AIRFLOW_PARSE_FIXTURES`, so the same words cannot retrieve differently by provider. Parsed values are still confirmed by the user before matching (§7.2). | Parse prompt, fixtures, Coder B chips |

## Shipped with these decisions (Coder A, round 3)

- **One catalog snapshot.** `/api/synthesize`, `/api/export` and the browser loader read rows and `catalog_revision`
  through `readConsistentSnapshot()` (revision → rows → revision, bounded retry), so a concurrent correction can never
  be validated, cached or exported under the wrong revision. No migration needed.
- **Verified-catalog loader** `useVerifiedCatalog()`: validated rows plus their revision, loaded lazily (Zod stays off
  the landing path). Explicit loading / unavailable (not_configured | error | changing) / empty / ready states.
  `evidenceViews()` gives B the distinct populations: all verified, eligible, plotted (both axes), not plotted, top-k.
- **One summary owner.** Header and body share one store; retry recovers both; a slow superseded request is dropped;
  counts and rows reconcile to one revision.
- **Curation race fixed.** A save, reopen or extract response never re-binds a form the curator switched away from.
- **Export wired** in header and footer (honest README-only file when the catalog is empty).
- **Gap Radar:** `availability: 'no_plottable_evidence'` and no ranked regions when nothing is plottable.
- **Docs:** migration 0003 in fresh-install steps; export and health endpoints in the README index.
- **Motion:** `.swap-in` animates only under `prefers-reduced-motion: no-preference`.
