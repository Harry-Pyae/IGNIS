# Source acquisition queue — R1

Prepared 2026-11-13. Discovery only until Nov 14–15. No record in this queue is a publication sign-off.

| Order | Exact source | What to inspect | Status |
|---|---|---|---|
| 1 | [NTRS 20150008962](https://ntrs.nasa.gov/citations/20150008962), download `20150008962.pdf` | Existing GMT96-T7/T8 and GMT45-T4 drafts; run conditions, original units, quote locators, changing flow | Pending R1 re-verification |
| 2 | [PSI-25 BASS-II](https://psi.nasa.gov/physci/repo/data/investigations/PSI-25), DOI `10.60555/4qc4-de67` | Actual file list, version, sample/run metadata, logs, footage associations | Indexed Version 4; actual archive inspection pending |
| 3 | [PMMA rods, NTRS 20150008961](https://ntrs.nasa.gov/citations/20150008961) | Run-specific conditions and outcomes; retain rod form | Pending full-paper inspection |
| 4 | [Saffire, NTRS 20170008805](https://ntrs.nasa.gov/citations/20170008805), `20170008805.pdf` | Named specimens, conditions, scale, outcomes, source locators | Pending extraction |
| 5 | [Saffire IV/V, NTRS 20210011521](https://ntrs.nasa.gov/citations/20210011521), `ICES 2021-266 0503-2021 final.pdf` | Solid runs; retain preliminary status and apparatus context; check asset copyright | Pending extraction |
| 6 | [SoFIE-MIST](https://science.nasa.gov/biological-physical/investigations/sofie-mist/) and [NTRS 20200000361](https://ntrs.nasa.gov/citations/20200000361) | Leads to completed flight-run data, including external heating; descriptions alone are not measurement records | Conditional; never block the mission |

Required per publishable run: campaign/test ID, exact material/class/form, supported outcome, verbatim quotation,
source title/URL, real reviewer. Numeric fields are nullable: oxygen %, airflow cm/s, thickness mm, pressure kPa,
optional measured spread mm/s. Keep original units and absolute/gauge pressure meaning in source support.
Record genuine locators/identifiers; never invent page numbers or use a study-wide range as a run value.

Both oxygen and airflow are needed to plot; missing values remain useful, honestly labeled records. Preserve
`condition_changes`, ignition/apparatus context and exclusions. Do not map non-ignition into an unsupported outcome.
Do not read new numeric values from figures or videos under the current curation rule.

Deduplicate by actual campaign/run identity, even across papers. Migration 0004 prevents case/outer-whitespace
variants of the same campaign/test ID; spelling aliases or different IDs for the same physical run still need R1 review.
Reopen the existing card to reconcile sources rather than create a second independent-looking observation.

Cable insulation and cargo packaging: no qualifying run has been established in this queue. The material picker
stays active until R1 supplies the exact supported `fuel_material` and form to A.

For each inspected source, append: reviewer; inspection date; exact filename/version; candidate test IDs;
table/quote locators; access problems; exclusions; next action. Publication occurs only in `/curate`.
