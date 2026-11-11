/**
 * The mission console (scenario builder → Evidence Map → Match Panel → Mission Brief → Gap Radar).
 * Code-split out of the landing chunk: Home.tsx lazy-loads it (src/pages/consoleLoader.ts decides when),
 * so the engine, Zod schemas and console UI stay off the first paint. Owner: Coder B (console sections).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Badge, Button, Chip, CitationChip, Panel, PresetChip, SectionHeader, Slider } from '../components/ui';
import { useVerifiedCatalog } from '../lib/catalog';
import { COPY } from '../lib/copy';
import { pickMaterial, presetScenario, resolveMaterial, SCENARIO_PRESETS } from '../engine/aliases';
import { applyEnvironment, isElevatedO2, visibleEnvironmentPresets, type EnvironmentPreset } from '../engine/environments';
import { briefingKey, currentBriefing, evidenceViews, type EvidenceViews } from '../engine/views';
import { FIELD_UNITS, PARAM_LABELS, ParseScenarioResponseSchema, SynthesizeResponseSchema, type Briefing, type ContinuousParam, type Experiment, type MatchResult, type ParsedScenario, type ResolvedMaterial, type ResolvedScenario } from '../lib/types';
import { gapGrid, gapRadar, type GapRadar as GapRadarData } from '../engine/gaps';
import { whyMatched } from '../engine/match';
import { t } from '../i18n';
import { missionEntry } from '../engine/mission';
import { contextSection } from '../lib/context-content';
import { GUIDED_MISSION_REQUEST, takePendingMission } from './consoleLoader';

function nasaPdfUrl(experiment: Experiment): string | null {
  if (!experiment.ntrs_id) return null;
  if (experiment.source_url.includes('/downloads/')) return experiment.source_url;
  return `https://ntrs.nasa.gov/api/citations/${encodeURIComponent(experiment.ntrs_id)}/downloads/${encodeURIComponent(experiment.ntrs_id)}.pdf`;
}

function experimentLabel(experiment: Experiment): string {
  return experiment.test_id.toLowerCase().startsWith(experiment.campaign.toLowerCase())
    ? experiment.test_id
    : `${experiment.campaign} ${experiment.test_id}`;
}

/** Signed environment presets only (none until R1 verifies them; the row stays hidden until then). */
const ENVIRONMENTS = visibleEnvironmentPresets();
const MISSION_STEPS = [
  { target: 's1', title: 'missionStepScenario', caption: 'missionCaptionScenario' },
  { target: 's2', title: 'missionStepMap', caption: 'missionCaptionMap' },
  { target: 's3', title: 'missionStepMatches', caption: 'missionCaptionMatches' },
  { target: 's4', title: 'missionStepBrief', caption: 'missionCaptionBrief' },
  { target: 's5', title: 'missionStepGaps', caption: 'missionCaptionGaps' },
] as const;

export function Console() {
  const { catalog, reload } = useVerifiedCatalog();
  const catalogExperiments = catalog.state === 'ready' ? catalog.experiments : [];
  const experiments = catalogExperiments;
  const mission = missionEntry(experiments);
  const missionCase = mission.state === 'available' ? mission.case : null;
  const hasCatalogSnapshot = catalog.state === 'ready' || catalog.state === 'empty';
  const revision = hasCatalogSnapshot ? catalog.revision : 'pending';
  const dataStatus = hasCatalogSnapshot ? 'connected' : catalog.state === 'unavailable' ? 'unavailable' : 'loading';
  const [presetId, setPresetId] = useState<string | null>(SCENARIO_PRESETS[0]?.id ?? null);
  const [scenario, setScenario] = useState<ParsedScenario>(() => ({
    domain: 'solid_flammability',
    fuel_material_raw: SCENARIO_PRESETS[0]?.material?.fuel_material ?? null,
    fuel_form: SCENARIO_PRESETS[0]?.fuel_form ?? null,
    thickness_mm: SCENARIO_PRESETS[0]?.thickness_mm ?? null,
    o2_pct: SCENARIO_PRESETS[0]?.o2_pct ?? null,
    flow_cm_s: SCENARIO_PRESETS[0]?.flow_cm_s ?? null,
    pressure_kpa: SCENARIO_PRESETS[0]?.pressure_kpa ?? null,
  }));
  const [materialChoice, setMaterialChoice] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ResolvedScenario | null>(null);
  const [description, setDescription] = useState('');
  const [parsing, setParsing] = useState(false);
  const [message, setMessage] = useState('');
  const [guidedStep, setGuidedStep] = useState<number | null>(null);
  const [appliedEnvironmentId, setAppliedEnvironmentId] = useState<string | null>(null);
  const scenarioEditor = useRef<HTMLDetailsElement>(null);
  const sourceMaterials = useMemo(() => experiments.map(({ domain, fuel_material, material_class }) => ({ domain, fuel_material, material_class })), [experiments]);
  const activePreset = SCENARIO_PRESETS.find((preset) => preset.id === presetId);
  const material = materialChoice
    ? pickMaterial(scenario.fuel_material_raw, materialChoice, sourceMaterials)
    : activePreset?.material && scenario.fuel_material_raw === activePreset.material.fuel_material
      ? presetScenario(activePreset, sourceMaterials).material
      : resolveMaterial(scenario.fuel_material_raw, sourceMaterials);
  const draft = useMemo<ResolvedScenario>(() => ({
    domain: scenario.domain,
    material,
    fuel_form: scenario.fuel_form,
    thickness_mm: scenario.thickness_mm,
    o2_pct: scenario.o2_pct,
    flow_cm_s: scenario.flow_cm_s,
    pressure_kpa: scenario.pressure_kpa,
  }), [material, scenario]);
  const views = useMemo(
    () => hasCatalogSnapshot ? evidenceViews(experiments, confirmed, revision) : null,
    [confirmed, experiments, hasCatalogSnapshot, revision],
  );
  const radar = useMemo(
    () => views ? gapRadar(gapGrid(experiments, confirmed), experiments) : null,
    [confirmed, experiments, views],
  );
  const briefingRequest = useMemo(() => {
    if (!confirmed || dataStatus !== 'connected' || !views?.top_k.length) return null;
    const experiment_ids = views.top_k.map(({ experiment }) => experiment.id);
    return {
      key: briefingKey(confirmed, revision, experiment_ids),
      catalog_revision: revision,
      scenario: confirmed,
      experiment_ids,
    };
  }, [confirmed, dataStatus, revision, views]);
  const [briefingResult, setBriefingResult] = useState<{ key: string; data: Briefing } | null>(null);
  const [briefingStatus, setBriefingStatus] = useState<{ key: string; state: 'loading' | 'ready' | 'fallback' } | null>(null);

  useEffect(() => {
    if (!briefingRequest) return;
    let current = true;
    const controller = new AbortController();
    const { key, catalog_revision, ...body } = briefingRequest;
    const timer = window.setTimeout(() => {
      setBriefingStatus({ key, state: 'loading' });
      void (async () => {
        try {
          const response = await fetch('/api/synthesize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          if (!response.ok) throw new Error('Synthesis request failed');
          const parsed = SynthesizeResponseSchema.safeParse(await response.json());
          if (!parsed.success) throw new Error('Synthesis response was invalid');
          if (parsed.data.catalog_revision !== catalog_revision) {
            if (current) {
              setBriefingStatus({ key, state: 'fallback' });
              reload();
            }
            return;
          }
          if (current) {
            setBriefingResult({ key, data: parsed.data });
            setBriefingStatus({ key, state: 'ready' });
          }
        } catch {
          if (current) setBriefingStatus({ key, state: 'fallback' });
        }
      })();
    }, 350);
    return () => {
      current = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [briefingRequest, reload]);

  const activeBriefing = currentBriefing(briefingResult, briefingRequest?.key ?? null);
  const activeBriefStatus = briefingRequest
    ? briefingStatus?.key === briefingRequest.key ? briefingStatus.state : 'waiting'
    : 'idle';
  const closestMatch = confirmed ? views?.top_k[0] ?? null : null;
  const outsideParams = views?.coverage?.params.filter((param) => param.state === 'outside_catalog_range') ?? [];
  const research = contextSection();

  const focusScenarioEditor = () => {
    const editor = scenarioEditor.current;
    if (!editor) return;
    editor.open = true;
    editor.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    });
    editor.querySelector('summary')?.focus();
  };

  function editScenario(update: Partial<ParsedScenario>, materialEdited = false) {
    setScenario((current) => ({ ...current, ...update }));
    if ('o2_pct' in update || 'pressure_kpa' in update) setAppliedEnvironmentId(null);
    setConfirmed(null);
    setMessage('');
    if (materialEdited) {
      setPresetId(null);
      setMaterialChoice(null);
    }
  }

  function moveSlider(update: Partial<Pick<ParsedScenario, 'o2_pct' | 'flow_cm_s'>>) {
    setScenario((current) => ({ ...current, ...update }));
    if ('o2_pct' in update) setAppliedEnvironmentId(null);
    setConfirmed((current) => current ? { ...current, ...update } : null);
    setMessage('');
  }

  const activeEnvironment = ENVIRONMENTS.find((env) => env.id === appliedEnvironmentId && env.o2_pct === scenario.o2_pct && env.pressure_kpa === scenario.pressure_kpa) ?? null;

  function chooseEnvironment(env: EnvironmentPreset) {
    setAppliedEnvironmentId(env.id);
    setScenario((current) => applyEnvironment(current, env));
    setConfirmed((current) => current ? applyEnvironment(current, env) : null);
    setMessage('');
  }

  const choosePreset = useCallback((id: string) => {
    const preset = SCENARIO_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    const value = presetScenario(preset, sourceMaterials);
    setPresetId(id);
    setAppliedEnvironmentId(null);
    setMaterialChoice(null);
    setConfirmed(null);
    setMessage('');
    setScenario({
      domain: 'solid_flammability',
      fuel_material_raw: preset.material?.fuel_material ?? preset.label,
      fuel_form: value.fuel_form,
      thickness_mm: value.thickness_mm,
      o2_pct: value.o2_pct,
      flow_cm_s: preset.flow_cm_s,
      pressure_kpa: value.pressure_kpa,
    });
  }, [sourceMaterials]);

  const startMission = useCallback((presetId: string | null) => {
    if (!presetId || !missionCase || presetId !== missionCase.preset_id) return;
    choosePreset(presetId);
    setGuidedStep(0);
  }, [choosePreset, missionCase]);

  useEffect(() => {
    const onMissionRequest = () => startMission(takePendingMission());
    window.addEventListener(GUIDED_MISSION_REQUEST, onMissionRequest);
    onMissionRequest();
    return () => window.removeEventListener(GUIDED_MISSION_REQUEST, onMissionRequest);
  }, [startMission]);

  useEffect(() => {
    if (guidedStep == null) return;
    document.getElementById(MISSION_STEPS[guidedStep]!.target)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [guidedStep]);

  async function parseDescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParsing(true);
    setMessage('');
    setConfirmed(null);
    try {
      const response = await fetch('/api/parse-scenario', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: description }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error('Scenario parsing is unavailable right now. You can still edit the fields below.');
      const result = ParseScenarioResponseSchema.safeParse(body);
      if (!result.success) throw new Error('The parser returned an invalid scenario. You can still edit the fields below.');
      setScenario(result.data.scenario);
      setPresetId(null);
      setAppliedEnvironmentId(null);
      setMaterialChoice(null);
      setMessage(`Parsed with ${result.data.provider}. Review and edit these values before confirming.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not parse that scenario. You can edit the fields below.');
    } finally {
      setParsing(false);
    }
  }

  return (
    <div id="console" className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-24 sm:px-6">
      <Panel as="section" aria-labelledby="s1" className="reveal">
        <SectionHeader id="s1" step={t('describeStep')} title={t('missionScenario')} />
        <MissionCaption step={guidedStep === 0 ? 0 : null} onStep={setGuidedStep} text={t(MISSION_STEPS[0].caption)} />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-xl border border-border bg-bg/45 p-3" aria-live="polite">
              {confirmed && closestMatch ? (
                <>
                  <p className="console-label mb-2 text-dim">{t('closestMatch')}: {experimentLabel(closestMatch.experiment)}</p>
                  <p className="mb-2 text-sm text-text">{whyMatched(closestMatch).summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {whyMatched(closestMatch).lines.map((line) => {
                      const [label, ...statusParts] = line.text.split(': ');
                      return <Chip key={line.key} status={line.status} label={label} statusText={statusParts.join(': ')} />;
                    })}
                  </div>
                </>
              ) : confirmed ? (
                <p className="text-sm text-dim">{dataStatus === 'unavailable' ? t('noMatchCatalog') : t('noEligibleMatchesForScenario')}</p>
              ) : (
                <p className="text-sm text-dim">{t('confirmForClosestMatch')}</p>
              )}
              {confirmed && outsideParams.map(({ parameter, scenario_value }) => (
                <p key={parameter} className="mt-2 console-label text-warn">
                  ⇥ {PARAM_LABELS[parameter]} {scenario_value} {FIELD_UNITS[parameter]} · {t('outsideCatalogRange')}
                </p>
              ))}
            </div>
            <details ref={scenarioEditor} className="rounded-xl border border-border bg-bg/35 p-3">
              <summary className="cursor-pointer console-label text-dim">{t('editScenario')} · {scenario.fuel_material_raw ?? t('selectMaterial')}</summary>
              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <p className="console-label mb-3 text-dim">{t('scenarioPresetsStart')}</p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label={t('scenarioPresets')}>
                    {SCENARIO_PRESETS.map((preset) => (
                      <PresetChip key={preset.id} active={preset.id === presetId} onClick={() => choosePreset(preset.id)}>{preset.label}</PresetChip>
                    ))}
                    <PresetChip active={presetId === null} onClick={() => {
                      setPresetId(null);
                      editScenario({ fuel_material_raw: null, fuel_form: null, thickness_mm: null, o2_pct: null, flow_cm_s: null, pressure_kpa: null }, true);
                    }}>{t('custom')}</PresetChip>
                  </div>
                </div>
                <form onSubmit={parseDescription} className="flex flex-col gap-2">
                  <label htmlFor="scenario-description" className="console-label text-dim">{t('orDescribeScenario')}</label>
                  <textarea id="scenario-description" value={description} onChange={(event) => { setDescription(event.target.value); setMessage(''); }} maxLength={2000} rows={2} placeholder={t('scenarioExample')} className="w-full resize-y rounded-xl border border-border bg-bg/70 px-3 py-2.5 text-sm text-text placeholder:text-faint focus:border-amber focus:outline-none" />
                  <Button type="submit" size="sm" disabled={parsing || !description.trim()} className="self-start">{parsing ? t('parsing') : t('parseScenario')}</Button>
                </form>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="console-label text-dim">{t('material')}</span>
                    <input value={scenario.fuel_material_raw ?? ''} onChange={(event) => editScenario({ fuel_material_raw: event.target.value || null }, true)} placeholder={t('enterMaterial')} className="h-10 rounded-xl border border-border bg-bg/70 px-3 text-sm text-text placeholder:text-faint focus:border-amber focus:outline-none" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="console-label text-dim">{t('form')}</span>
                    <select value={scenario.fuel_form ?? ''} onChange={(event) => editScenario({ fuel_form: (event.target.value || null) as ParsedScenario['fuel_form'] })} className="h-10 rounded-xl border border-border bg-bg/70 px-3 text-sm text-text focus:border-amber focus:outline-none">
                      <option value="">{t('notSpecified')}</option>
                      {['flat_sheet', 'rod', 'fabric', 'thick_slab'].map((form) => <option key={form} value={form}>{form.replace('_', ' ')}</option>)}
                    </select>
                  </label>
                </div>
                {material.status === 'resolved' ? (
                  <p className="text-sm text-success">{material.raw ? `Resolved “${material.raw}” to ${material.fuel_material.replace(/_/g, ' ')} (${material.material_class.replace(/_/g, ' ')}).` : `Material: ${material.fuel_material.replace(/_/g, ' ')}.`}</p>
                ) : (
                  <div className="flex flex-col gap-2 rounded-xl border border-warn/30 bg-warn/[0.05] p-3 text-sm text-dim">
                    <p>{material.reason === 'ambiguous' ? t('chooseAmbiguousMaterial') : t('chooseCatalogMaterial')}</p>
                    {material.candidates.length > 0 ? (
                      <select value="" onChange={(event) => { setMaterialChoice(event.target.value); setConfirmed(null); }} className="h-10 rounded-xl border border-border bg-bg px-3 text-sm text-text">
                        <option value="" disabled>{t('selectMaterial')}</option>
                        {material.candidates.map((candidate) => <option key={candidate} value={candidate}>{candidate.replace(/_/g, ' ')}</option>)}
                      </select>
                    ) : catalog.state === 'unavailable' ? (
                      <div className="flex items-center gap-2"><span>{t('catalogUnavailableForMaterials')}</span><Button size="sm" onClick={reload}>{t('retry')}</Button></div>
                    ) : <p>{COPY.absence}</p>}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="console-label text-dim">{t('thicknessMm')}</span>
                    <input type="number" min="0" step="any" value={scenario.thickness_mm ?? ''} onChange={(event) => editScenario({ thickness_mm: event.target.value === '' ? null : Number(event.target.value) })} placeholder={t('notSpecified')} className="h-10 rounded-xl border border-border bg-bg/70 px-3 text-sm text-text placeholder:text-faint focus:border-amber focus:outline-none" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="console-label text-dim">{t('pressureKpa')}</span>
                    <input type="number" min="0" step="any" value={scenario.pressure_kpa ?? ''} onChange={(event) => editScenario({ pressure_kpa: event.target.value === '' ? null : Number(event.target.value) })} placeholder={t('notSpecified')} className="h-10 rounded-xl border border-border bg-bg/70 px-3 text-sm text-text placeholder:text-faint focus:border-amber focus:outline-none" />
                  </label>
                </div>
              </div>
            </details>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" disabled={material.status !== 'resolved'} onClick={() => {
                setConfirmed(draft);
                setMessage(catalog.state === 'unavailable' ? t('confirmedCatalogUnavailable') : t('confirmedCatalog'));
              }}>
                {t('confirmScenario')}
              </Button>
              {confirmed && <span role="status" className="text-sm text-success">{t('confirmed')} · {views?.top_k.length ?? 0} {t('confirmedMatches')}</span>}
            </div>
            {message && <p role="status" className="text-sm text-dim">{message}</p>}
          </div>
          <div className="flex flex-col gap-5">
            {ENVIRONMENTS.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="console-label text-dim">{t('environments')}</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label={t('environments')}>
                  {ENVIRONMENTS.map((env) => (
                    <PresetChip key={env.id} active={activeEnvironment?.id === env.id} onClick={() => chooseEnvironment(env)}>{env.label}</PresetChip>
                  ))}
                </div>
                <p className="text-[13px] text-dim">{COPY.environmentExplanation}</p>
                {activeEnvironment && (
                  <p className="text-[13px] text-text">
                    {activeEnvironment.context}{' '}
                    {activeEnvironment.verification.source_url && <a href={activeEnvironment.verification.source_url} target="_blank" rel="noreferrer" className="text-amber underline underline-offset-4">{t('source')}</a>}
                  </p>
                )}
                {activeEnvironment && <p className="text-[13px] text-success">{COPY.environmentApplied}</p>}
                {activeEnvironment && isElevatedO2(activeEnvironment) && <p className="text-[13px] text-warn">{COPY.elevatedO2(activeEnvironment.o2_pct)}</p>}
              </div>
            )}
            <Slider label="O₂" unit="%" min={14} max={30} value={scenario.o2_pct} onChange={(value) => moveSlider({ o2_pct: value })} onClear={() => moveSlider({ o2_pct: null })} allowUnspecified unspecifiedValue={21} unspecifiedLabel={t('notSpecified')} setValueLabel={t('setOxygen')} clearValueLabel={t('clearOxygen')} />
            <Slider label="Airflow" unit="cm/s" min={0} max={30} value={scenario.flow_cm_s} onChange={(value) => moveSlider({ flow_cm_s: value })} onClear={() => moveSlider({ flow_cm_s: null })} allowUnspecified unspecifiedLabel={t('notSpecified')} setValueLabel={t('setAirflow')} clearValueLabel={t('clearAirflow')} />
            <p className="text-[13px] text-dim">{COPY.sliderCaption}</p>
          </div>
        </div>
      </Panel>

      <Panel as="section" aria-labelledby="s2" className="reveal">
        <SectionHeader
          id="s2"
          step={t('retrieveStep')}
          title={t('evidenceMap')}
        />
        <MissionCaption step={guidedStep === 1 ? 1 : null} onStep={setGuidedStep} text={t(MISSION_STEPS[1].caption)} />
        <InvestigationSummary
          scenario={scenario}
          material={material}
          views={views}
          onEdit={focusScenarioEditor}
        />
        <EvidenceMap key={revision} experiments={views?.eligible ?? experiments} scenario={confirmed} matches={views?.top_k ?? []} status={dataStatus} />
      </Panel>

      <div className="grid gap-6">
        <Panel as="section" aria-labelledby="s3" className="reveal">
        <SectionHeader id="s3" step={t('matchesStep')} title={t('matchPanel')} />
          <MissionCaption step={guidedStep === 2 ? 2 : null} onStep={setGuidedStep} text={t(MISSION_STEPS[2].caption)} />
          <MatchPanel matches={views?.top_k ?? []} status={dataStatus} confirmed={confirmed !== null} />
        </Panel>
        <Panel as="section" aria-labelledby="s4">
          <SectionHeader id="s4" step={t('briefStep')} title={t('missionBrief')} />
          <MissionCaption step={guidedStep === 3 ? 3 : null} onStep={setGuidedStep} text={t(MISSION_STEPS[3].caption)} />
          <MissionBrief
            briefing={activeBriefing}
            status={activeBriefStatus}
            confirmed={confirmed !== null}
            matches={views?.top_k ?? []}
            onCitation={focusExperiment}
          />
        </Panel>
      </div>

      <Panel as="section" aria-labelledby="s5" className="reveal">
        <SectionHeader id="s5" step={t('gapStep')} title={t('evidenceGapRadar')} />
        <MissionCaption step={guidedStep === 4 ? 4 : null} onStep={setGuidedStep} text={t(MISSION_STEPS[4].caption)} />
        <GapRadarPanel data={radar} status={dataStatus} scenarioActive={confirmed !== null} />
      </Panel>
      {research && <ResearchContext section={research} />}
    </div>
  );
}

function MissionCaption({ step, onStep, text }: { step: number | null; onStep: (step: number | null) => void; text: string }) {
  if (step == null) return null;
  const active = MISSION_STEPS[step]!;
  return (
    <aside role="note" aria-label={t('guidedMission')} className="mb-4 rounded-lg border border-amber/30 bg-amber/[0.04] px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <p aria-live="polite" className="console-label text-amber">{`Step ${step + 1} of ${MISSION_STEPS.length} · ${t(active.title)}`}</p>
          <p className="mt-1 text-sm leading-relaxed text-dim">{text}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <div className="mr-1 flex items-center gap-1" aria-label={t('missionProgress')}>
            {MISSION_STEPS.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`${t('goToMissionStep')} ${index + 1}: ${t(item.title)}`}
                aria-current={index === step ? 'step' : undefined}
                onClick={() => onStep(index)}
                className="grid size-10 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
              ><span aria-hidden className={`size-3 rounded-full border ${index === step ? 'border-amber bg-amber' : 'border-faint bg-transparent'}`} /></button>
            ))}
          </div>
          <Button size="sm" variant="ghost" disabled={step === 0} onClick={() => onStep(step - 1)}>{t('missionBack')}</Button>
          <Button size="sm" onClick={() => onStep(step === MISSION_STEPS.length - 1 ? null : step + 1)}>{t(step === MISSION_STEPS.length - 1 ? 'missionDone' : 'missionNext')}</Button>
          <Button size="sm" variant="ghost" onClick={() => onStep(null)}>{t('exploreFreely')}</Button>
        </div>
      </div>
    </aside>
  );
}

function InvestigationSummary({
  scenario,
  material,
  views,
  onEdit,
}: {
  scenario: ParsedScenario;
  material: ResolvedMaterial;
  views: EvidenceViews | null;
  onEdit: () => void;
}) {
  const summary = COPY.summary;
  const materialName = material.status === 'resolved' ? material.fuel_material.replace(/_/g, ' ') : scenario.fuel_material_raw ?? t('notSpecified');
  const form = scenario.fuel_form?.replace(/_/g, ' ') ?? t('notSpecified');
  const conditions = [
    scenario.o2_pct == null ? t('notSpecified') : `${scenario.o2_pct}% O₂`,
    scenario.flow_cm_s == null ? t('notSpecified') : `${scenario.flow_cm_s} cm/s`,
  ].join(' · ');
  const evidence = views
    ? [summary.eligible(views.eligible.length), summary.plotted(views.plotted.length), summary.notPlotted(views.not_plotted.length)]
    : [t('loading')];

  return (
    <div aria-label={summary.evidence} className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-bg/35 p-3 sm:grid-cols-4">
      <div className="min-w-0">
        <p className="console-label text-dim">{summary.scenario}</p>
        <p className="mt-1 break-words text-sm text-text">{materialName} · {form}</p>
        <button type="button" onClick={onEdit} className="mt-1 text-xs text-amber underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber">{t('edit')}</button>
      </div>
      <div className="min-w-0">
        <p className="console-label text-dim">{summary.conditions}</p>
        <p className="mt-1 break-words text-sm text-text">{conditions}</p>
      </div>
      <div className="min-w-0 sm:col-span-2">
        <p className="console-label text-dim">{summary.evidence}</p>
        <p className="mt-1 break-words text-sm text-text">{evidence.join(' · ')}</p>
        <p className="mt-1 text-xs text-dim">{views ? summary.topMatches(views.top_k.length) : t('loading')}</p>
      </div>
    </div>
  );
}

function ResearchContext({ section }: { section: NonNullable<ReturnType<typeof contextSection>> }) {
  const groups = [
    { title: t('whereItHappened'), entries: section.entries.filter((entry) => entry.kind === 'facility') },
    { title: t('whatItStudied'), entries: section.entries.filter((entry) => entry.kind === 'investigation') },
    { title: t('whyItMatters'), entries: section.entries.filter((entry) => entry.kind === 'spinoff' || entry.kind === 'heritage') },
  ].filter((group) => group.entries.length > 0);

  return (
    <Panel as="section" aria-labelledby="research-context-title" className="flex flex-col gap-5">
      <div>
        <span className="console-label text-dim">{section.banner}</span>
        <h2 id="research-context-title" className="display mt-2 text-xl text-text">{t('understandResearch')}</h2>
      </div>
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="console-label mb-2 text-dim">{group.title}</h3>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.entries.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-border/70 bg-bg/30 p-4">
                <h4 className="text-sm font-medium text-text">{entry.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-dim">{entry.text}</p>
                <a href={entry.source_url!} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-amber underline underline-offset-4">{t('source')}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Panel>
  );
}

function EvidenceMap({
  experiments,
  scenario,
  matches,
  status,
}: {
  experiments: Experiment[];
  scenario: ResolvedScenario | null;
  matches: MatchResult[];
  status: 'connected' | 'loading' | 'unavailable';
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const coordinateRecords = experiments.filter((experiment) => experiment.o2_pct != null && experiment.flow_cm_s != null);
  const isOnAxes = (experiment: Experiment) => experiment.o2_pct! >= 14 && experiment.o2_pct! <= 30 && experiment.flow_cm_s! >= 0 && experiment.flow_cm_s! <= 30;
  const plotted = coordinateRecords.filter(isOnAxes);
  const outsideAxesCount = coordinateRecords.length - plotted.length;
  const grid = gapGrid(experiments, scenario);
  const missingAxisCount = grid.population - grid.plotted;
  const selected = experiments.find((experiment) => experiment.id === selectedId);
  const matchIds = new Set(matches.slice(0, 3).map((match) => match.experiment.id));
  const envelope = grid.envelope;
  const outsideEnvelope = !!scenario && !!envelope && (
    (scenario.o2_pct != null && (scenario.o2_pct < envelope.o2_min || scenario.o2_pct > envelope.o2_max)) ||
    (scenario.flow_cm_s != null && (scenario.flow_cm_s < envelope.flow_min || scenario.flow_cm_s > envelope.flow_max))
  );
  const width = 760;
  const height = 330;
  const left = 54;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (flow: number) => left + (flow / 30) * plotWidth;
  const y = (o2: number) => top + ((30 - o2) / 16) * plotHeight;
  const outcomeColor = (outcome: Experiment['outcome']) => {
    if (outcome === 'sustained') return 'var(--color-flame)';
    if (outcome === 'extinguished') return 'var(--color-blue)';
    if (outcome === 'transition') return 'var(--color-violet)';
    if (outcome === 'partial') return 'var(--color-success)';
    return 'var(--color-faint)';
  };

  return (
    <div>
      {status === 'loading' ? (
        <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('catalogConnecting')}</p>
      ) : status === 'unavailable' ? (
        <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('catalogNotConnected')}</p>
      ) : coordinateRecords.length === 0 ? (
        <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('mapNoPoints')}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-bg/45 p-2 sm:p-4">
            <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label={t('mapAccessibility')} className="block h-auto min-w-[520px] w-full">
              <title>{t('mapVerifiedTitle')}</title>
              <defs>
                <pattern id="ignis-untested-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="var(--color-bg)" fillOpacity=".45" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-faint)" strokeOpacity=".38" strokeWidth="1.3" />
                </pattern>
                <clipPath id="ignis-plot-clip"><rect x={left} y={top} width={plotWidth} height={plotHeight} /></clipPath>
              </defs>
              {grid.cells.flatMap((row) => row).map((cell) => cell.state === 'tested' ? null : (
                <rect
                  key={`${cell.o2_min}-${cell.flow_min}`}
                  x={x(cell.flow_min)}
                  y={y(cell.o2_max)}
                  width={x(cell.flow_max) - x(cell.flow_min)}
                  height={y(cell.o2_min) - y(cell.o2_max)}
                  fill={cell.state === 'untested' ? 'url(#ignis-untested-hatch)' : 'var(--color-faint)'}
                  fillOpacity={cell.state === 'outside_range' ? '.07' : '1'}
                  stroke={cell.state === 'outside_range' ? 'var(--color-faint)' : 'none'}
                  strokeDasharray={cell.state === 'outside_range' ? '2 3' : undefined}
                  strokeWidth=".5"
                />
              ))}
              {grid.envelope && (
                <rect
                  x={x(grid.envelope.flow_min)}
                  y={y(grid.envelope.o2_max)}
                  width={x(grid.envelope.flow_max) - x(grid.envelope.flow_min)}
                  height={y(grid.envelope.o2_min) - y(grid.envelope.o2_max)}
                  fill="none"
                  stroke="var(--color-warn)"
                  strokeDasharray="5 4"
                  strokeWidth="1"
                  opacity=".7"
                  pointerEvents="none"
                  clipPath="url(#ignis-plot-clip)"
                />
              )}
              {[0, 5, 10, 15, 20, 25, 30].map((flow) => (
                <g key={`x-${flow}`}>
                  <line x1={x(flow)} x2={x(flow)} y1={top} y2={top + plotHeight} stroke="var(--color-border)" strokeDasharray="3 5" />
                  <text x={x(flow)} y={height - 20} textAnchor="middle" fill="var(--color-dim)" fontSize="11">{flow}</text>
                </g>
              ))}
              {[14, 18, 22, 26, 30].map((o2) => (
                <g key={`y-${o2}`}>
                  <line x1={left} x2={left + plotWidth} y1={y(o2)} y2={y(o2)} stroke="var(--color-border)" strokeDasharray="3 5" />
                  <text x={left - 10} y={y(o2) + 4} textAnchor="end" fill="var(--color-dim)" fontSize="11">{o2}</text>
                </g>
              ))}
              <line x1={left} x2={left + plotWidth} y1={top + plotHeight} y2={top + plotHeight} stroke="var(--color-faint)" />
              <line x1={left} x2={left} y1={top} y2={top + plotHeight} stroke="var(--color-faint)" />
              <text x={left + plotWidth / 2} y={height - 3} textAnchor="middle" fill="var(--color-dim)" fontSize="12">{t('airflowAxis')}</text>
              <text transform={`translate(15 ${top + plotHeight / 2}) rotate(-90)`} textAnchor="middle" fill="var(--color-dim)" fontSize="12">{t('oxygenAxis')}</text>
              <g clipPath="url(#ignis-plot-clip)">
              {scenario?.o2_pct != null && scenario.flow_cm_s != null && matches.slice(0, 3).map(({ experiment }) => (
                experiment.o2_pct != null && experiment.flow_cm_s != null && (
                  <line key={`match-${experiment.id}`} x1={x(scenario.flow_cm_s!)} y1={y(scenario.o2_pct!)} x2={x(experiment.flow_cm_s!)} y2={y(experiment.o2_pct!)} stroke="var(--color-amber)" strokeWidth="1.2" strokeDasharray="4 5" opacity=".7" />
                )
              ))}
              {plotted.map((experiment) => (
                <g
                  key={experiment.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${experimentLabel(experiment)}, ${experiment.outcome ?? t('outcomeUnreported')}, ${experiment.o2_pct}% oxygen, ${experiment.flow_cm_s} centimeters per second airflow`}
                  onClick={() => { setSelectedId(experiment.id); focusExperiment(experiment.id); }}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(experiment.id); focusExperiment(experiment.id); } }}
                  className="cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber"
                >
                  {matchIds.has(experiment.id) && <circle cx={x(experiment.flow_cm_s!)} cy={y(experiment.o2_pct!)} r="9" fill="none" stroke="var(--color-text)" strokeWidth="1.25" />}
                  <circle cx={x(experiment.flow_cm_s!)} cy={y(experiment.o2_pct!)} r="5.5" fill={outcomeColor(experiment.outcome)} stroke="var(--color-bg)" strokeWidth="1.5" />
                  <title>{experiment.test_id} · {experiment.outcome ?? t('outcomeNotReported')} · {experiment.o2_pct}% O₂ · {experiment.flow_cm_s} cm/s</title>
                </g>
              ))}
              </g>
              {scenario?.o2_pct != null && scenario.flow_cm_s != null && scenario.o2_pct >= 14 && scenario.o2_pct <= 30 && scenario.flow_cm_s >= 0 && scenario.flow_cm_s <= 30 && (
                <g aria-label={`Scenario marker: ${scenario.flow_cm_s} centimeters per second airflow, ${scenario.o2_pct}% oxygen`}>
                  <circle cx={x(scenario.flow_cm_s)} cy={y(scenario.o2_pct)} r="11" fill="none" stroke="var(--color-text)" strokeWidth="2" />
                  <circle cx={x(scenario.flow_cm_s)} cy={y(scenario.o2_pct)} r="3" fill="var(--color-text)" />
                </g>
              )}
            </svg>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-dim" aria-label="Evidence map legend">
            <span className="inline-flex items-center gap-2"><i aria-hidden className="size-2.5 rounded-full bg-flame" />{t('sustained')}</span>
            <span className="inline-flex items-center gap-2"><i aria-hidden className="size-2.5 rounded-full bg-blue" />{t('extinguished')}</span>
            <span className="inline-flex items-center gap-2"><i aria-hidden className="size-2.5 rounded-full bg-violet" />{t('transition')}</span>
            <span className="inline-flex items-center gap-2"><i aria-hidden className="size-2.5 rounded-full bg-success" />{t('partial')}</span>
            <span className="inline-flex items-center gap-2"><i aria-hidden className="size-2.5 rounded-full bg-faint" />{t('outcomeNotReported')}</span>
            <span className="inline-flex items-center gap-2"><i aria-hidden className="size-2.5 rounded-full border border-lit" />{t('scenario')}</span>
            <span className="inline-flex items-center gap-2"><i aria-hidden className="h-3 w-4 rounded-sm border border-faint/50" style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 3px, var(--color-faint) 3px 4px)' }} />{t('untestedCell')}</span>
            <span className="inline-flex items-center gap-2"><i aria-hidden className="h-3 w-4 rounded-sm border border-dashed border-faint/60 bg-faint/10" />{t('outsideCatalogRange')}</span>
          </div>
          <p className="mt-3 text-[13px] text-dim">{plotted.length} {t('plotted')} · {matches.length} {t('rankedMatches')}</p>
          {outsideAxesCount > 0 && <p role="status" className="mt-2 text-[13px] text-dim">{outsideAxesCount} {t(outsideAxesCount === 1 ? 'outsideAxesRecord' : 'outsideAxesRecords')}</p>}
          {outsideEnvelope && <p role="status" className="mt-3 rounded-lg border border-warn/35 bg-warn/[0.05] px-3 py-2 text-sm text-warn">{COPY.outsideRange}</p>}
          {selected && (
            <div className="mt-4 rounded-xl border border-border bg-bg/55 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                <p className="console-label text-amber">{selected.campaign} · {selected.test_id}</p>
                <p className="mt-1 text-sm text-text">{selected.outcome ?? 'Outcome not reported'} · {selected.o2_pct}% O₂ · {selected.flow_cm_s} cm/s</p>
                </div>
                {(nasaPdfUrl(selected) || selected.source_url) && <a href={nasaPdfUrl(selected) ?? selected.source_url} target="_blank" rel="noreferrer" className="text-sm text-amber underline underline-offset-4">{nasaPdfUrl(selected) ? 'NASA paper PDF' : 'Source'}</a>}
              </div>
              {selected.key_observation_quote && <blockquote className="mt-3 border-l-2 border-raised pl-3 text-sm leading-relaxed text-dim">“{selected.key_observation_quote}”</blockquote>}
              <p className="mt-2 text-xs text-dim">{[selected.source_page != null ? `${t('sourcePage')} ${selected.source_page}` : null, selected.source_figure, selected.source_table].filter(Boolean).join(' · ')}</p>
            </div>
          )}
          {missingAxisCount > 0 && <p className="mt-3 text-[13px] text-dim">{missingAxisCount} {t(missingAxisCount === 1 ? 'eligibleRecord' : 'eligibleRecords')} {t(missingAxisCount === 1 ? 'missingAxisRecord' : 'missingAxisRecords')}</p>}
        </>
      )}
    </div>
  );
}

function MatchPanel({ matches, status, confirmed }: { matches: MatchResult[]; status: 'connected' | 'loading' | 'unavailable'; confirmed: boolean }) {
  if (status === 'loading') return <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('waitingCatalog')}</p>;
  if (status === 'unavailable') return <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('matchCatalogUnavailable')}</p>;
  if (!confirmed) return <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('confirmForMatches')}</p>;
  if (matches.length === 0) return <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('noVerifiedMatches')}</p>;

  return (
    <div className="grid auto-rows-fr gap-3 lg:grid-cols-3">
      {matches.map((match, index) => {
        const why = whyMatched(match);
        const { experiment } = match;
        const provenance = [experiment.source_page != null ? `p. ${experiment.source_page}` : null, experiment.source_figure, experiment.source_table].filter(Boolean).join(' · ');
        const field = (label: string, value: string, parameter?: ContinuousParam) => {
          const qualifier = parameter ? experiment.condition_changes?.filter((change) => change.parameter === parameter).map((change) => change.note) : [];
          return (
            <div key={label} className="grid grid-cols-[minmax(5.5rem,.7fr)_minmax(0,1.3fr)] gap-3 py-2">
              <dt className="text-xs text-dim">{label}</dt>
              <dd className="min-w-0 break-words text-right text-sm tabular-nums text-text [overflow-wrap:anywhere]">
                {value}
                {qualifier?.map((note, noteIndex) => <span key={`${label}-${noteIndex}`} className="mt-1 block text-left text-xs leading-relaxed text-warn">{note}</span>)}
              </dd>
            </div>
          );
        };
        return (
          <article key={experiment.id} id={`experiment-${experiment.id}`} className="flex min-w-0 flex-col rounded-xl border border-border bg-bg/45 p-4">
            {experiment.media_url && <div className="mb-3 aspect-[16/9] overflow-hidden rounded-lg border border-border bg-bg/60">
              <img src={experiment.media_url} alt={`${COPY.campaignContext}: ${experimentLabel(experiment)}`} loading="lazy" className="size-full object-cover" />
            </div>}
            {experiment.media_url && <p className="mb-2 console-label text-dim">{COPY.campaignContext}</p>}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="console-label text-amber">{t('match')} {index + 1}</span>
                <h3 className="mt-1 min-w-0 break-words text-base font-semibold text-text [overflow-wrap:anywhere]">{experimentLabel(experiment)}</h3>
              </div>
            </div>
            <dl className="mt-3 divide-y divide-border/70 border-y border-border/70">
              {field(t('material'), experiment.fuel_material.replace(/_/g, ' '))}
              {field(t('form'), experiment.fuel_form.replace(/_/g, ' '))}
              {field(t('oxygenAxis'), experiment.o2_pct == null ? t('oxygenNotReported') : `${experiment.o2_pct}%`, 'o2_pct')}
              {field(t('airflowAxis'), experiment.flow_cm_s == null ? t('airflowNotReported') : `${experiment.flow_cm_s} cm/s`, 'flow_cm_s')}
              {field(t('thicknessMm'), experiment.thickness_mm == null ? t('notReported') : `${experiment.thickness_mm} mm`, 'thickness_mm')}
              {field(t('pressureKpa'), experiment.pressure_kpa == null ? t('notReported') : `${experiment.pressure_kpa} kPa`, 'pressure_kpa')}
              <div className="grid grid-cols-[minmax(5.5rem,.7fr)_minmax(0,1.3fr)] items-center gap-3 py-2">
                <dt className="text-xs text-dim">{t('outcome')}</dt>
                <dd className="flex justify-end">{experiment.outcome ? <Badge variant={experiment.outcome} /> : <Badge variant="neutral">{t('outcomeNotReported')}</Badge>}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-text">{why.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {why.lines.map((line) => {
                const [label, ...statusParts] = line.text.split(': ');
                return <Chip key={line.key} status={line.status} label={label} statusText={statusParts.join(': ')} />;
              })}
            </div>
            {experiment.key_observation_quote && (
              <details className="mt-3 border-t border-border/70 pt-3 text-sm">
                <summary className="cursor-pointer text-dim can-hover:hover:text-text">{t('sourceExcerpt')}</summary>
                <blockquote className="mt-2 border-l-2 border-raised pl-3 leading-relaxed text-dim">“{experiment.key_observation_quote}”</blockquote>
                  <a href="#s2" className="mt-3 inline-block text-xs text-amber underline underline-offset-4">{t('backToMap')}</a>
              </details>
            )}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-[13px]">
              {provenance && <span className="text-dim">{provenance}</span>}
              {(nasaPdfUrl(experiment) || experiment.source_url) && <a href={nasaPdfUrl(experiment) ?? experiment.source_url} target="_blank" rel="noreferrer" className="text-amber underline underline-offset-4">{nasaPdfUrl(experiment) ? t('nasaPaperPdf') : t('source')}</a>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function focusExperiment(experimentId: string) {
  const card = document.getElementById(`experiment-${experimentId}`);
  if (!card) return;
  const excerpt = card.querySelector('details');
  if (excerpt instanceof HTMLDetailsElement) excerpt.open = true;
  card.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  card.classList.add('ring-2', 'ring-amber');
  window.setTimeout(() => card.classList.remove('ring-2', 'ring-amber'), 1800);
}

function MissionBrief({
  briefing,
  status,
  confirmed,
  matches,
  onCitation,
}: {
  briefing: Briefing | null;
  status: 'idle' | 'waiting' | 'loading' | 'ready' | 'fallback';
  confirmed: boolean;
  matches: MatchResult[];
  onCitation: (experimentId: string) => void;
}) {
  if (!confirmed) return <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('confirmForBrief')}</p>;
  if (matches.length === 0) return <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('noBriefMatches')}</p>;
  if (status === 'waiting') return <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('preparingBrief')}</p>;
  if (status === 'loading') return <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('buildingBrief')}</p>;
  if (status === 'fallback' || !briefing) return <EvidenceOnlyFallback matches={matches} />;

  const groups = [
    { classification: 'OBSERVED', title: t('observed'), tone: 'observed' as const },
    { classification: 'SUPPORTED', title: t('supportedInterpretation'), tone: 'interpretation' as const },
    { classification: 'UNTESTED', title: t('untested'), tone: 'untested' as const },
  ];
  const experimentByEvidence = new Map(briefing.evidence.map(({ evidence_id, experiment_id }) => [evidence_id, experiment_id]));

  return (
    <div className="flex flex-col gap-3">
      {briefing.status === 'fallback' && <p role="status" className="rounded-lg border border-warn/35 bg-warn/[0.05] px-3 py-2 text-sm text-warn">{COPY.fallback}</p>}
      {briefing.withheld_count > 0 && <Badge variant="warn">{COPY.withheld(briefing.withheld_count)}</Badge>}
      {groups.map((group) => {
        const claims = briefing.claims.filter((claim) => claim.classification === group.classification);
        if (!claims.length) return null;
        return (
          <Panel key={group.classification} tone={group.tone} className="!p-4">
            <h3 className="console-label text-text">{group.title}</h3>
            <ul className="mt-2 flex flex-col gap-3">
              {claims.map((claim, index) => (
                <li key={`${group.classification}-${index}`}>
                  <p className="text-sm leading-relaxed text-text">{claim.text}</p>
                  {claim.evidence_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {claim.evidence_ids.map((evidenceId) => {
                        const experimentId = experimentByEvidence.get(evidenceId);
                        return experimentId ? <CitationChip key={evidenceId} evidenceId={evidenceId} onClick={() => onCitation(experimentId)} /> : null;
                      })}
                    </div>
                  )}
                  {claim.gap_ids.length > 0 && <p className="mt-2 console-label text-warn">{claim.gap_ids.map((gapId) => `${t('gap')} ${gapId}`).join(' · ')}</p>}
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}
      <p className="text-[12px] leading-relaxed text-dim">{COPY.claimsGuarantee}</p>
    </div>
  );
}

function EvidenceOnlyFallback({ matches }: { matches: MatchResult[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <p role="status" className="rounded-lg border border-warn/35 bg-warn/[0.05] px-3 py-2 text-sm text-warn lg:col-span-3">
        {COPY.fallback}
      </p>
      <h3 className="console-label text-dim lg:col-span-3">{t('matchedEvidenceOnly')}</h3>
      {matches.map(({ experiment }) => (
        <article key={experiment.id} className="rounded-xl border border-border bg-bg/45 p-3">
          <p className="text-sm font-medium text-text">{experimentLabel(experiment)}</p>
          <p className="mt-1 text-sm text-dim">
          {experiment.outcome ?? t('outcomeNotReported')} · {experiment.o2_pct == null ? t('oxygenNotReported') : `${experiment.o2_pct}% O₂`} · {experiment.flow_cm_s == null ? t('airflowNotReported') : `${experiment.flow_cm_s} cm/s`}
          </p>
          {experiment.source_page != null && <p className="mt-1 text-[12px] text-dim">{t('sourcePage')} {experiment.source_page}{experiment.source_figure ? ` · ${experiment.source_figure}` : ''}</p>}
          {experiment.key_observation_quote && <p className="mt-2 text-sm leading-relaxed text-dim">“{experiment.key_observation_quote}”</p>}
          {(nasaPdfUrl(experiment) || experiment.source_url) && <a href={nasaPdfUrl(experiment) ?? experiment.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-amber underline underline-offset-4">{nasaPdfUrl(experiment) ? t('nasaPaperPdf') : t('source')}</a>}
        </article>
      ))}
    </div>
  );
}

function GapRadarPanel({
  data,
  status,
  scenarioActive,
}: {
  data: GapRadarData | null;
  status: 'connected' | 'loading' | 'unavailable';
  scenarioActive: boolean;
}) {
  if (status === 'loading') return <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('loadingCoverage')}</p>;
  if (status === 'unavailable') return <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-6 text-center text-sm text-dim">{t('coverageUnavailable')}</p>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-dim">{COPY.gapNote}</p>
      {data.availability === 'no_plottable_evidence' ? (
        <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-5 text-sm text-dim">
          {scenarioActive
            ? t('noScenarioRange')
            : t('noCatalogRange')}
        </p>
      ) : data.regions.length > 0 ? (
        <div>
          <h3 className="console-label mb-3 text-dim">{t('largestUntestedRegions')}</h3>
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.regions.map((region, index) => (
              <li key={`${region.o2_min}-${region.o2_max}-${region.flow_min}-${region.flow_max}`} className="rounded-xl border border-border bg-bg/45 p-4">
                <p className="console-label text-amber">{t('region')} {index + 1} · {region.cells} {t('untestedCells')}</p>
                <p className="mt-2 text-sm text-text">O₂ {region.o2_min}–{region.o2_max}%</p>
                <p className="mt-1 text-sm text-text">Airflow {region.flow_min}–{region.flow_max} cm/s</p>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p role="status" className="rounded-xl border border-border bg-bg/50 px-4 py-5 text-sm text-dim">{t('noUntestedWithinRange')}</p>
      )}
      {data.thin_materials.length > 0 && (
        <div>
          <h3 className="console-label mb-3 text-dim">{t('thinMaterialsHeading')}</h3>
          <ul className="flex flex-wrap gap-2">
            {data.thin_materials.map((material) => (
              <li key={material.fuel_material} className="rounded-lg border border-border bg-bg/45 px-3 py-2 text-sm text-text">
                {material.fuel_material.replace(/_/g, ' ')} · {material.count} {material.count === 1 ? t('record') : t('records')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
