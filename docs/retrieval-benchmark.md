# Retrieval evaluation — R1 expectations, A execution, R3 record

Status: protocol and offline harness ready; no expert-reviewed real-data results claimed.

Use an actual verified catalog export and 6–10 queries. R1 writes expectations before running the engine.
Never tune weights to make one demo look better. The expected list is the full ordered top-k (up to five), or `[]`
for abstention. Document ties/acceptable ordering before freezing expectations.

| Case | Required scenario | Expected result / rationale | Actual / conclusion |
|---|---|---|---|
| 1 | Exact material and reported conditions | R1 pending | Not run |
| 2 | Class-only match | R1 pending; distinguish retrieval from equivalence | Not run |
| 3 | Ambiguous/unresolved material | Abstain until resolved; confirm actual scenario | Not run |
| 4 | Missing user parameter | Excluded parameter, not silently defaulted | Not run |
| 5 | Source missing a parameter | Missing-source explanation distinct from unspecified input | Not run |
| 6 | Outside catalog range | Explicit range state, no clamping | Not run |
| 7 | Changing-condition run | Preserve condition history; justify inclusion | Not run |
| 8 | No eligible evidence | No results; bounded absence | Not run |

Also check an identical-value parameter (zero scoring range), class fallback, and any changed ordering after a
catalog addition. A revised catalog requires an explicit re-review of expectations, not an overwritten passing result.

## Offline harness

Save the existing JSON export locally and create a reviewed JSON case file with:

```text
{
  reviewed_by: actual full reviewer name,
  catalog_revision: exact export revision,
  cases: [
    { name, rationale, scenario: complete ResolvedScenario, expected_ids: ordered experiment UUIDs }
    ...6–10 cases...
  ]
}
```

The outline is deliberately not runnable fake data. `scenario` uses the current shared schema, including its
deterministically resolved material object and null numeric inputs. Use real UUIDs; human names are not placeholders.

PowerShell, with paths to those real files:

```powershell
$env:IGNIS_RETRIEVAL_CASES = 'C:\path\reviewed-cases.json'
$env:IGNIS_RETRIEVAL_CATALOG = 'C:\path\verified-export.json'
npx vitest run tests/retrieval-benchmark.test.ts
Remove-Item Env:IGNIS_RETRIEVAL_CASES, Env:IGNIS_RETRIEVAL_CATALOG
```

The harness validates the reviewer, schemas, revision, count, and exact expected IDs; failures include deterministic
match explanations. It makes no network calls or database writes. Without a case path the suite is explicitly skipped,
never counted as successful real-catalog evaluation. Record output, app commit, revision, reviewer, and unresolved
differences in QA-LOG. Manually inspect chips, changing conditions, and gaps as well as top-result order.
