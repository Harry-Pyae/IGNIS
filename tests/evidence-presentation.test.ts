import { describe, expect, it } from 'vitest';
import { evidenceLocator, evidenceSource } from '../src/lib/evidenceSource';
import { mapCoordinates } from '../src/engine/views';
import { card } from './helpers';

describe('reviewed source destinations', () => {
  it('preserves section-only references and never invents missing page numbers', () => {
    const source = card({ source_page: null, source_figure: null, source_table: null, source_section: 'Appendix: Test summary' });
    expect(evidenceLocator(source)).toBe('Appendix: Test summary');
    expect(evidenceLocator({ ...source, source_section: null })).toBe('');
    expect(evidenceLocator({ ...source, source_page: 9, source_table: 'Table 2' })).toBe('p. 9 · Table 2 · Appendix: Test summary');
  });
  it('preserves custom NTRS filenames and citation pages without guessing a download', () => {
    for (const source_url of [
      'https://ntrs.nasa.gov/citations/20210011521',
      'https://ntrs.nasa.gov/api/citations/20210011521/downloads/ICES%202021-266%200503-2021%20final.pdf',
    ]) expect(evidenceSource({ source_url })).toEqual({ url: source_url, pdf: source_url.endsWith('.pdf') });
  });
  it('does not render executable or malformed source destinations', () => {
    for (const source_url of ['javascript:alert(1)', 'data:text/html,hello', 'not a URL']) expect(evidenceSource({ source_url })).toBeNull();
  });
});

describe('map populations', () => {
  it('separates measured points beyond axes from missing measurements, including zero and boundaries', () => {
    const low = card({ o2_pct: 14, flow_cm_s: 0 });
    const high = card({ o2_pct: 30, flow_cm_s: 30 });
    const beyond = card({ o2_pct: 31, flow_cm_s: 10 });
    const missing = card({ o2_pct: null, flow_cm_s: 10 });
    const population = mapCoordinates([low, high, beyond, missing]);
    expect(population.visible).toEqual([low, high]);
    expect(population.outside).toEqual([beyond]);
    expect(population.missing).toEqual([missing]);
    expect(population.coordinates).toEqual([low, high, beyond]);
  });
  it('keeps every missing-coordinate record visible in the count even with no dots', () => {
    const result = mapCoordinates([card({ o2_pct: null, flow_cm_s: null })]);
    expect(result.visible).toEqual([]);
    expect(result.missing).toHaveLength(1);
    expect(mapCoordinates([]).coordinates).toEqual([]);
  });
});
