import { describe, expect, it } from 'vitest';
import { applyExtraction, EMPTY_FORM, valuesToRecord } from '../src/lib/curation';
import { sanitizeDraft } from '../src/lib/extract';
import { ExtractDraftSchema } from '../src/lib/types';

const PAPER_A = `The thickness of the sample is about 0.32 mm with an area density 18.2 mg/cm2.
Ambient oxygen was 21% by volume. doi:10.1000/paper-a`;
const PAPER_B = `Thin PMMA sheets burned in 16% oxygen. No thickness is given in this excerpt.`;

describe('A1 — extraction schema', () => {
  it('can never populate the verifier or publication/media metadata', () => {
    const d = ExtractDraftSchema.parse({
      verified_by: 'model',
      media_url: 'https://x.test/a.png',
      telemetry: { label: 'x' },
      domain: 'smoke_detection',
      source_url: 'https://evil.example',
      o2_pct: 21,
    });
    for (const k of ['verified_by', 'media_url', 'telemetry', 'domain', 'source_url']) expect(d).not.toHaveProperty(k);
  });

  it('always returns every extractable key, null when unstated', () => {
    const d = ExtractDraftSchema.parse({});
    expect(d.thickness_mm).toBeNull();
    expect(d.doi).toBeNull();
    expect(d.field_quotes).toEqual({});
  });
});

describe('A1 — every populated numeric field needs a quote found in the excerpt', () => {
  it('nulls a number without a quote, and one whose quote is not in the excerpt', () => {
    const draft = ExtractDraftSchema.parse({
      thickness_mm: 0.32,
      o2_pct: 21,
      flow_cm_s: 10,
      field_quotes: { thickness_mm: 'about 0.32 mm', flow_cm_s: 'flow speed was 10 cm/s' },
    });
    const { draft: out, dropped } = sanitizeDraft(draft, PAPER_A);
    expect(out.thickness_mm).toBe(0.32);
    expect(out.o2_pct).toBeNull();
    expect(out.flow_cm_s).toBeNull();
    expect(dropped).toEqual([
      { field: 'o2_pct', reason: 'missing_quote' },
      { field: 'flow_cm_s', reason: 'quote_not_in_excerpt' },
    ]);
  });

  it('tolerates line wraps and quote styles in the excerpt', () => {
    const draft = ExtractDraftSchema.parse({ thickness_mm: 0.32, field_quotes: { thickness_mm: 'sample is about 0.32 mm with' } });
    expect(sanitizeDraft(draft, 'The thickness of the\nsample is about\n0.32 mm with an area').draft.thickness_mm).toBe(0.32);
  });
});

describe('A1 regression — paper A then paper B', () => {
  it("B's draft has thickness and DOI null; nothing from A leaks through", () => {
    const draftA = sanitizeDraft(
      ExtractDraftSchema.parse({
        test_id: 'A-1',
        thickness_mm: 0.32,
        doi: '10.1000/paper-a',
        field_quotes: { thickness_mm: 'about 0.32 mm' },
      }),
      PAPER_A,
    ).draft;
    const afterA = applyExtraction({ ...EMPTY_FORM, source_url: 'https://ntrs.nasa.gov/a', notes: 'curator note for A' }, draftA, []);
    expect(afterA.thickness_mm).toBe('0.32');
    expect(afterA.doi).toBe('10.1000/paper-a');

    const draftB = sanitizeDraft(
      ExtractDraftSchema.parse({ test_id: 'B-1', o2_pct: 16, field_quotes: { o2_pct: 'in 16% oxygen' } }),
      PAPER_B,
    ).draft;
    const afterB = applyExtraction(afterA, draftB, []);
    expect(afterB.thickness_mm).toBe('');
    expect(afterB.doi).toBe('');
    expect(afterB.source_url).toBeUndefined(); // not carried unless explicitly chosen
    expect(afterB.notes).toBeUndefined();
    expect(afterB.test_id).toBe('B-1');
    expect(afterB.o2_pct).toBe('16');
    expect(valuesToRecord(afterB)).toHaveProperty('errors'); // B is incomplete: cannot be saved as-is
  });

  it('carries forward only the fields the curator ticks', () => {
    const after = applyExtraction({ source_url: 'https://ntrs.nasa.gov/b', doi: 'x' }, ExtractDraftSchema.parse({}), ['source_url', 'doi']);
    expect(after.source_url).toBe('https://ntrs.nasa.gov/b');
    expect(after.doi).toBe(''); // doi is extractable: always replaced by the new draft
  });
});
