import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyEnvironment, ENVIRONMENT_PRESETS } from '../src/engine/environments';
import { missionEntry, MISSION_CASE, type MissionCase } from '../src/engine/mission';
import { briefingKey, currentBriefing, evidenceViews } from '../src/engine/views';
import { CONTEXT_ENTRIES, contextSection } from '../src/lib/context-content';
import { COPY } from '../src/lib/copy';
import { SEED_CARDS } from '../src/lib/fixtures';
import { ParsedScenarioSchema, ResolvedScenarioSchema } from '../src/lib/types';
import { card, scenario } from './helpers';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });

describe('Round 6 #2: summary strip reuses the revision-binding contract', () => {
  it('evidenceViews already exposes every count, each with its own meaning', () => {
    const noFlow = card({ test_id: 'NO-FLOW', flow_cm_s: null });
    const v = evidenceViews([...SEED_CARDS, noFlow], scenario(), 'rev', 2);
    expect([v.eligible.length, v.plotted.length, v.not_plotted.length, v.top_k.length]).toEqual([4, 3, 1, 2]);
    expect(v.plotted.length + v.not_plotted.length).toBe(v.eligible.length); // not-plotted is never hidden
  });

  it('an updated scenario, revision or match set can never relabel an old Brief as current', () => {
    const ids = ['a', 'b'];
    const old = { key: briefingKey(scenario(), 'rev-1', ids), data: 'old brief' };
    expect(currentBriefing(old, briefingKey(scenario(), 'rev-1', ids))).toBe('old brief');
    expect(currentBriefing(old, briefingKey(scenario({ o2_pct: 30 }), 'rev-1', ids))).toBeNull();
    expect(currentBriefing(old, briefingKey(scenario(), 'rev-2', ids))).toBeNull();
    expect(currentBriefing(old, briefingKey(scenario(), 'rev-1', ['a']))).toBeNull();
    expect(currentBriefing(old, null)).toBeNull(); // no active request → no Brief
  });
});

describe('Round 6 #5: context section', () => {
  it('is omitted entirely while nothing is signed, and shows only signed entries under the banner', () => {
    expect(contextSection()).toBeNull();
    const [a, b] = CONTEXT_ENTRIES as [(typeof CONTEXT_ENTRIES)[number], (typeof CONTEXT_ENTRIES)[number]];
    const signed = { ...a, verified_by: 'Ada Reviewer', source_url: 'https://www.nasa.gov/x' };
    expect(contextSection([signed, b])).toEqual({ banner: 'Research context — not matched evidence.', entries: [signed] });
  });
});

describe('Round 6 #3: environment presets set atmosphere inputs only, no gravity modeling', () => {
  it('the exploration (Moon base) preset changes oxygen and pressure and nothing else', () => {
    const moon = ENVIRONMENT_PRESETS.find((p) => p.id === 'exploration-atmosphere')!;
    const before = scenario();
    const after = applyEnvironment(before, moon);
    const changed = Object.keys(after).filter((k) => after[k as keyof typeof after] !== before[k as keyof typeof before]);
    expect(changed.sort()).toEqual(['o2_pct', 'pressure_kpa']);
    expect(moon.label).toMatch(/proposed/i); // a proposed habitat atmosphere, labelled as such
  });

  it('no gravity parameter exists in the scenario contract or enters matching', () => {
    for (const shape of [ParsedScenarioSchema.shape, ResolvedScenarioSchema.shape]) {
      expect(Object.keys(shape).filter((k) => /grav|g_level|lunar/i.test(k))).toEqual([]);
    }
    const matchingCode = [...files('src/engine'), 'src/lib/gates.ts', 'src/lib/coverage.ts', 'src/lib/types.ts', ...files('src/server'), ...files('api')];
    const hits = matchingCode.filter((f) => /\bgravity\b|g_level|lunar_g/i.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]); // "microgravity" (the experiments' setting) doesn't match \bgravity\b
  });
});

describe('Round 6 #1: mission entry shows the availability state until a reviewed case exists', () => {
  const verified = [card({ id: 'v1', test_id: 'V1' }), card({ id: 'v2', test_id: 'V2' })];
  const draft = card({ id: 'd1', test_id: 'D1', verified_by: null });
  const ready: MissionCase = { preset_id: 'crew-clothing', experiment_ids: ['v1', 'v2'], reviewed_by: 'Ada Reviewer' };

  it('no case yet → unavailable, with the approved line', () => {
    expect(MISSION_CASE).toBeNull();
    expect(missionEntry(verified)).toEqual({ state: 'unavailable', message: COPY.missionAvailability });
  });

  it('opens only for a case reviewed by a named person, built from currently verified cards', () => {
    expect(missionEntry(verified, ready)).toEqual({ state: 'available', case: ready });
    expect(missionEntry(verified, { ...ready, reviewed_by: null }).state).toBe('unavailable');
    expect(missionEntry(verified, { ...ready, reviewed_by: 'R3' }).state).toBe('unavailable'); // a role isn't a person
    expect(missionEntry([...verified, draft], { ...ready, experiment_ids: ['v1', 'd1'] }).state).toBe('unavailable');
    expect(missionEntry([], ready).state).toBe('unavailable'); // card no longer in the snapshot
    expect(missionEntry(verified, { ...ready, experiment_ids: [] }).state).toBe('unavailable');
  });
});

describe('Round 6 copy', () => {
  it('approved strings, with no prediction, safety, certification or confidence language', () => {
    expect(COPY.landingCta).toEqual({ mission: 'Start the guided mission', explore: 'Explore the evidence' });
    expect(COPY.environmentExplanation).toBe('Sets oxygen and pressure only.');
    expect(COPY.contextBanner).toBe('Research context — not matched evidence.');
    expect(COPY.campaignContext).toBe('Campaign context');
    const s = COPY.summary;
    expect(new Set([s.eligible(2), s.plotted(2), s.notPlotted(2), s.topMatches(2)]).size).toBe(4);
    expect([s.topMatches(1), s.notPlotted(1)]).toEqual(['1 top match', '1 missing plot coordinates']);
    const text = [COPY.missionAvailability, COPY.environmentApplied, s.scenario, s.conditions, s.evidence].join(' ');
    expect(text).not.toMatch(/predict|would burn|will burn|\bsafe\b|unsafe|approved|qualified|prohibited|confidence|score|%/i);
  });
});
