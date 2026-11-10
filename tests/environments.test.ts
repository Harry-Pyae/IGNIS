import { describe, expect, it } from 'vitest';
import {
  applyEnvironment,
  ENVIRONMENT_PRESETS,
  isElevatedO2,
  KPA_PER_PSI,
  visibleEnvironmentPresets,
  type EnvironmentPreset,
} from '../src/engine/environments';
import { COPY } from '../src/lib/copy';
import { ResolvedScenarioSchema } from '../src/lib/types';
import { FIXTURES } from '../src/lib/fixtures';

const verified = (p: EnvironmentPreset, over: Partial<EnvironmentPreset['verification']> = {}): EnvironmentPreset => ({
  ...p,
  verification: { ...p.verification, status: 'verified', verified_by: 'Ada Reviewer', source_url: 'https://ntrs.nasa.gov/citations/1', ...over },
});

describe('environment presets (DECISIONS-ROUND5 #1)', () => {
  it('normalized pressure matches the original units, and the three presets exist', () => {
    expect(ENVIRONMENT_PRESETS.map((p) => p.id)).toEqual(['iss-baseline', 'exploration-atmosphere', 'eva-suit']);
    for (const p of ENVIRONMENT_PRESETS) {
      const kpa = p.pressure_original.unit === 'psi' ? p.pressure_original.value * KPA_PER_PSI : p.pressure_original.value;
      expect(Math.abs(kpa - p.pressure_kpa)).toBeLessThan(0.05);
      expect(p.o2_pct).toBeGreaterThan(0);
      expect(p.o2_pct).toBeLessThanOrEqual(100);
    }
  });

  it('sets oxygen and pressure only: airflow, material, form and thickness are untouched', () => {
    const scenario = FIXTURES.zeroRange.scenario;
    for (const p of ENVIRONMENT_PRESETS) {
      const next = applyEnvironment(scenario, p);
      expect(next).toEqual({ ...scenario, o2_pct: p.o2_pct, pressure_kpa: p.pressure_kpa });
      expect(ResolvedScenarioSchema.safeParse(next).success).toBe(true); // still a valid scenario contract
    }
  });

  it('the elevated-O₂ note shows exactly when oxygen is above 21%', () => {
    expect(ENVIRONMENT_PRESETS.map((p) => [p.id, isElevatedO2(p)])).toEqual([
      ['iss-baseline', false],
      ['exploration-atmosphere', true],
      ['eva-suit', true],
    ]);
  });

  it('gate: placeholders never render; only a signed preset with a real name and a source does', () => {
    expect(visibleEnvironmentPresets()).toEqual([]); // nothing signed yet → the row stays hidden
    for (const p of ENVIRONMENT_PRESETS) {
      expect(p.verification.check.length).toBeGreaterThan(20);
      expect(p.verification.source_to_confirm.length).toBeGreaterThan(20);
      if (p.verification.status === 'placeholder') expect(p.verification.verified_by).toBeNull();
    }
    const [iss] = ENVIRONMENT_PRESETS;
    expect(visibleEnvironmentPresets([verified(iss!)])).toHaveLength(1);
    expect(visibleEnvironmentPresets([verified(iss!, { verified_by: 'R1' })])).toEqual([]); // a role isn't a person
    expect(visibleEnvironmentPresets([verified(iss!, { source_url: null })])).toEqual([]);
    expect(visibleEnvironmentPresets([verified(iss!, { status: 'placeholder' })])).toEqual([]);
  });

  it('copy frames the outside-range result as the point, with no prediction or safety language', () => {
    expect(COPY.environmentCaption).toMatch(/where the verified catalog's evidence ends/);
    const text = [COPY.environmentCaption, COPY.elevatedO2(30), ...ENVIRONMENT_PRESETS.map((p) => p.context)].join(' ');
    expect(text).not.toMatch(/predict|would burn|will burn|\bsafe\b|unsafe|approved|qualified|prohibited|malfunction|error/i);
  });
});
