import type { Experiment } from './types.js';

/** Use only recorded locators; a section-only source remains traceable without inventing a page. */
export function evidenceLocator(experiment: Pick<Experiment, 'source_page' | 'source_figure' | 'source_table' | 'source_section'>): string {
  return [
    experiment.source_page != null ? `p. ${experiment.source_page}` : null,
    experiment.source_figure, experiment.source_table, experiment.source_section,
  ].filter(Boolean).join(' · ');
}

/** Preserve the reviewed destination: NTRS downloads do not share a uniform filename. */
export function evidenceSource(experiment: Pick<Experiment, 'source_url'>): { url: string; pdf: boolean } | null {
  try {
    const url = new URL(experiment.source_url);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return { url: experiment.source_url, pdf: /\.pdf$/i.test(url.pathname) };
  } catch {
    return null;
  }
}
