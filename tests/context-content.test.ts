import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTEXT_ENTRIES, renderableContext, type ContextEntry } from '../src/lib/context-content';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });

describe('context content (DECISIONS-ROUND5 #3)', () => {
  it('renders only entries signed by a real person with an https source; all start unsigned', () => {
    expect(renderableContext()).toEqual([]);
    const [entry] = CONTEXT_ENTRIES as [ContextEntry];
    const sign = (over: Partial<ContextEntry>) => renderableContext([{ ...entry, ...over }]);
    expect(sign({ verified_by: 'Ada Reviewer', source_url: 'https://www.nasa.gov/x' })).toHaveLength(1);
    expect(sign({ verified_by: 'R1', source_url: 'https://www.nasa.gov/x' })).toEqual([]);
    expect(sign({ verified_by: 'Ada Reviewer', source_url: null })).toEqual([]);
    expect(sign({ verified_by: 'Ada Reviewer', source_url: 'http://example.com' })).toEqual([]);
  });

  it('ids are unique; no figures and no prediction, rating or certification language', () => {
    expect(new Set(CONTEXT_ENTRIES.map((e) => e.id)).size).toBe(CONTEXT_ENTRIES.length);
    for (const e of CONTEXT_ENTRIES) {
      const en = `${e.title} ${e.text}`;
      expect(en).not.toMatch(/predict|would burn|will burn|safety score|\/100|approved|qualified|prohibited|\bsafe\b/i);
      // No figures: only years, the Apollo 1 date and mission/experiment names may contain digits.
      const digits = en.replace(/\b(19|20)\d\d\b|\b27 January\b|Apollo 1\b|FLEX-2/g, '');
      expect(digits, e.id).not.toMatch(/\d/);
      if (e.text_my) expect(e.text_my, e.id).not.toMatch(/[0-9၀-၉]/); // no Western or Burmese digits
    }
  });

  it('stays off evidence code: only the console imports it, and only the signed-only section', () => {
    const importers = [...files('src'), ...files('api')]
      .map((f) => f.replace(/\\/g, '/'))
      .filter((f) => !f.endsWith('src/lib/context-content.ts'))
      .filter((f) => /context-content/.test(readFileSync(f, 'utf8')));
    expect(importers).toEqual(['src/pages/Console.tsx']);
    const imports = readFileSync('src/pages/Console.tsx', 'utf8').match(/import \{([^}]*)\} from '\.\.\/lib\/context-content'/);
    expect(imports?.[1]?.trim()).toBe('contextSection'); // never CONTEXT_ENTRIES or unsigned entries
  });
});
