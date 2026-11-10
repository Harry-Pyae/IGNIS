import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLASS_HINTS, MATERIAL_ALIASES } from '../src/engine/aliases';
import { MY_ALIAS_CANDIDATES, MY_DRAFT, MY_DRAFT_STATUS } from '../src/i18n/my.draft';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });

describe('Burmese draft cannot ship (DECISIONS-ROUND5 #2)', () => {
  it('nothing in src/ or api/ imports the unreviewed draft', () => {
    const importers = [...files('src'), ...files('api')]
      .filter((f) => !f.replace(/\\/g, '/').endsWith('src/i18n/my.draft.ts'))
      .filter((f) => /my\.draft/.test(readFileSync(f, 'utf8')));
    expect(importers).toEqual([]);
  });

  it('the shipped locale set is EN only, and the draft is marked unreviewed', () => {
    const i18n = readFileSync('src/i18n/index.ts', 'utf8');
    expect(i18n).toMatch(/export type Locale = 'en';/);
    expect(i18n).not.toMatch(/[က-႟]/); // no Burmese script in the shipped strings
    expect(MY_DRAFT_STATUS).toBe('UNREVIEWED');
    expect(Object.keys(MY_DRAFT).length).toBeGreaterThan(0);
  });

  it('staged Burmese alias phrases are not live in the resolver until R3 signs them', () => {
    for (const { phrase } of MY_ALIAS_CANDIDATES) {
      expect(MATERIAL_ALIASES[phrase]).toBeUndefined();
      expect(CLASS_HINTS[phrase]).toBeUndefined();
    }
  });
});
