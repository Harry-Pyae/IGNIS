import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { retrieve, whyMatched } from '../src/engine/match';
import { ExperimentSchema, ResolvedScenarioSchema } from '../src/lib/types';
import { verifierNameProblem } from '../src/lib/verifier';

// Optional offline evaluation of a real export; never reads credentials or contacts production.
const casesPath = process.env.IGNIS_RETRIEVAL_CASES;
it.skipIf(!casesPath)('matches R1-reviewed expectations against the exact catalog revision', () => {
  const suite = z.object({
    reviewed_by: z.string().refine((name) => !verifierNameProblem(name)),
    catalog_revision: z.string().min(1),
    cases: z.array(z.object({
      name: z.string().min(1), rationale: z.string().min(1),
      scenario: ResolvedScenarioSchema,
      expected_ids: z.array(z.uuid()).max(5),
    })).min(6).max(10),
  }).parse(JSON.parse(readFileSync(casesPath!, 'utf8')));
  const catalogPath = process.env.IGNIS_RETRIEVAL_CATALOG;
  expect(catalogPath, 'Set IGNIS_RETRIEVAL_CATALOG to the matching verified JSON export').toBeTruthy();
  const catalog = z.object({
    catalog_revision: z.string(), count: z.number().int(), experiments: z.array(ExperimentSchema),
  }).parse(JSON.parse(readFileSync(catalogPath!, 'utf8')));
  expect(catalog.catalog_revision).toBe(suite.catalog_revision);
  expect(catalog.count).toBe(catalog.experiments.length);
  expect(catalog.experiments.every((card) => !verifierNameProblem(card.verified_by))).toBe(true);
  for (const query of suite.cases) {
    expect(new Set(query.expected_ids).size).toBe(query.expected_ids.length);
    const result = retrieve(query.scenario, catalog.experiments, catalog.catalog_revision);
    const detail = result.matches.map((match) => ({ id: match.experiment.id, test_id: match.experiment.test_id, explanation: whyMatched(match) }));
    expect(result.matches.map((match) => match.experiment.id), `${query.name}: ${query.rationale}\n${JSON.stringify(detail)}`).toEqual(query.expected_ids);
  }
});
