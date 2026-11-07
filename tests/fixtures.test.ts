import { describe, expect, it } from 'vitest';
import { computeCoverage } from '../src/lib/coverage';
import { FIXTURES, SEED_CARDS } from '../src/lib/fixtures';
import { eligibleCards, gateExperiment } from '../src/lib/gates';
import { BriefingSchema, ExperimentSchema, MatchResultSchema, ResolvedScenarioSchema } from '../src/lib/types';
import { buildContext, claimProblem, deterministicObserved } from '../src/server/claims';

describe('contract fixtures (B) match the schemas and the real rules', () => {
  it('seed cards are valid experiments', () => SEED_CARDS.forEach((c) => ExperimentSchema.parse(c)));

  it('unresolvedMaterial: gates refuse to guess', () => {
    const s = ResolvedScenarioSchema.parse(FIXTURES.unresolvedMaterial.scenario);
    expect(gateExperiment(s, SEED_CARDS[0]!).reasons).toContain('material_unresolved');
  });

  it('noEligibleRows: coverage fixture equals computeCoverage', () => {
    const f = FIXTURES.noEligibleRows;
    const eligible = eligibleCards(f.scenario, f.catalog);
    expect(eligible).toEqual([]);
    expect(computeCoverage(f.scenario, eligible, [], 'fixture-rev')).toEqual(f.coverage);
  });

  it('match fixtures are valid MatchResults', () => {
    for (const f of [FIXTURES.missingData, FIXTURES.zeroRange, FIXTURES.outsideRange]) {
      ResolvedScenarioSchema.parse(f.scenario);
      MatchResultSchema.parse(f.match);
    }
  });

  it('zeroRange / outsideRange chips agree with coverage', () => {
    const z = computeCoverage(FIXTURES.zeroRange.scenario, SEED_CARDS, [SEED_CARDS[0]!], 'r');
    expect(z.params.map((p) => p.state)).toEqual(['covered', 'covered', 'covered', 'covered']);
    const o = computeCoverage(FIXTURES.outsideRange.scenario, SEED_CARDS, [SEED_CARDS[0]!], 'r');
    expect(o.params.find((p) => p.parameter === 'o2_pct')).toMatchObject({ state: 'outside_catalog_range', catalog_min: 18.7, catalog_max: 21 });
  });

  it('briefing fixtures are valid, and the fallback is exactly what the pipeline renders', () => {
    BriefingSchema.parse(FIXTURES.withheldClaims.briefing);
    const fb = BriefingSchema.parse(FIXTURES.totalProviderFailure.briefing);
    const ctx = buildContext([SEED_CARDS[0]!], computeCoverage(FIXTURES.zeroRange.scenario, SEED_CARDS, [SEED_CARDS[0]!], 'r'));
    expect(deterministicObserved(ctx)).toEqual(fb.claims);
  });

  it('withheld fixture claims pass the validator against the cards they cite', () => {
    const ctx = buildContext([SEED_CARDS[0]!, SEED_CARDS[2]!], computeCoverage(FIXTURES.zeroRange.scenario, SEED_CARDS, [], 'r'));
    for (const c of FIXTURES.withheldClaims.briefing.claims) expect(claimProblem(c, ctx)).toBeNull();
  });
});
