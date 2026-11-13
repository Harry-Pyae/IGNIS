import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EvidenceMap, EvidenceOnlyFallback, InvestigationSummary, MatchPanel } from '../src/pages/Console';
import { investigationSummary } from '../src/engine/views';
import { matchScenario } from '../src/engine/match';
import { COPY } from '../src/lib/copy';
import { card, scenario, t4 } from './helpers';

const onSelect = () => {};
describe('evidence rendering regression checks', () => {
  it('distinguishes a failed catalog from loading and missing evidence', () => {
    const summary = investigationSummary(scenario(), null, null);
    const unavailable = renderToStaticMarkup(<InvestigationSummary summary={summary} status="unavailable" onEdit={() => {}} />);
    expect(unavailable).toContain('Catalog unavailable');
    expect(unavailable).not.toContain('Loading');
    const loading = renderToStaticMarkup(<InvestigationSummary summary={summary} status="loading" onEdit={() => {}} />);
    expect(loading).toContain('Loading');
    const map = renderToStaticMarkup(<EvidenceMap experiments={[]} scenario={null} matches={[]} status="unavailable" selectedId={null} onSelect={onSelect} />);
    expect(map).toContain('This does not mean there is no matching evidence.');
    expect(map).not.toContain('SUPABASE');
  });
  it('shows source titles and section locators consistently, including when narration is unavailable', () => {
    const experiment = card({ source_title: 'Reviewed run report', source_page: null, source_figure: null, source_section: 'Appendix: test conditions' });
    const matches = matchScenario(scenario(), [experiment]);
    for (const view of [
      <EvidenceMap experiments={[experiment]} scenario={null} matches={matches} status="connected" selectedId={experiment.id} onSelect={onSelect} />,
      <MatchPanel matches={matches} confirmed status="connected" selectedId={experiment.id} onSelect={onSelect} />,
      <EvidenceOnlyFallback matches={matches} />,
    ]) {
      const html = renderToStaticMarkup(view);
      expect(html).toContain('Reviewed run report');
      expect(html).toContain('Appendix: test conditions');
    }
  });
  it('reports missing coordinates when there are no map dots', () => {
    const html = renderToStaticMarkup(<EvidenceMap experiments={[card({ o2_pct: null })]} scenario={null} matches={[]} status="connected" selectedId={null} onSelect={onSelect} />);
    expect(html).not.toContain('<svg');
    expect(html).toContain('1 ');
    expect(html).toContain('1 eligible record lacks oxygen or airflow values and is not plotted.');
  });
  it('keeps distinct outcome shapes and selected-record state without changing data colors', () => {
    const records = (['sustained', 'extinguished', 'transition', 'partial'] as const).map((outcome, i) => card({ id: `record-${i}`, outcome, flow_cm_s: i * 5 }));
    const html = renderToStaticMarkup(<EvidenceMap experiments={records} scenario={null} matches={[]} status="connected" selectedId="record-2" onSelect={onSelect} />);
    expect(html).toContain('id="map-point-record-2"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('role="button"');
    expect(html).toContain('var(--color-violet)');
    expect(html).toContain('<path');
    expect(html).toContain(COPY.mapScope);
  });
  it('retains the exact source URL, changing-condition notice and persistent selection on cards', () => {
    const experiment = t4({ source_url: 'https://ntrs.nasa.gov/citations/20210011521', ntrs_id: '20210011521' });
    const matches = matchScenario(scenario(), [experiment]);
    const html = renderToStaticMarkup(<MatchPanel matches={matches} confirmed status="connected" selectedId={experiment.id} onSelect={onSelect} />);
    expect(html).toContain(`href="${experiment.source_url}"`);
    expect(html).not.toContain('/downloads/20210011521.pdf');
    expect(html).toContain(COPY.changingConditions);
    expect(html).toContain('ring-2 ring-amber');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('reduced after ignition');
  });
});
