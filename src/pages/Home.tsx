import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Chip,
  CitationChip,
  FlameSphereArt,
  Icon,
  Panel,
  PresetChip,
  SectionHeader,
  Slider,
  type IconName,
} from '../components/ui';
import { CatalogBlock, ExportButton } from '../components/CatalogStatus';
import { useCatalogSummary, useVerifiedCatalog } from '../lib/catalog';
import { COPY } from '../lib/copy';
import { pickMaterial, presetScenario, resolveMaterial, SCENARIO_PRESETS } from '../engine/aliases';
import { evidenceViews } from '../engine/views';
import { FIELD_UNITS, PARAM_LABELS, ParseScenarioResponseSchema, SynthesizeResponseSchema, type Briefing, type Experiment, type MatchResult, type ParsedScenario, type ResolvedScenario } from '../lib/types';
import { gapGrid, gapRadar, type GapRadar as GapRadarData } from '../engine/gaps';
import { whyMatched } from '../engine/match';
import { t } from '../i18n';

/** §8.1 Scenario Builder templates. Presets carry their explicit material mapping (§5a) — Coder A/B wire them. */
const PRESETS = [
  'Cabin wall panel (PMMA)',
  'Cable insulation',
  'Crew clothing (cotton blend)',
  'Cargo packaging',
  'Custom',
] as const;

export function Home() {
  return (
    <main id="top">
      <Hero />
      <HowItWorks />
      <CatalogSection />
      <Principle />
      <GuidedDemoPanel />
      <ConsoleSkeleton />
      <Footer />
    </main>
  );
}

/* -------------------------------------------------------------------------- */

const rise = (i: number) => ({ style: { '--i': i } as CSSProperties });

function Hero() {
  return (
    <section className="relative isolate overflow-hidden xl:flex xl:min-h-[min(86svh,760px)] xl:items-center">
      {/*
        Wide screens (xl+): the art is a full-bleed background; a left scrim keeps the copy column on dark ground.
        Below xl the copy column covers the busy screen + console lights, so the art moves into a framed
        "window" under the copy instead of fighting it. Same <img>, same preload — only placement changes.
      */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 max-xl:hidden bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-bg)_92%,transparent)_0%,color-mix(in_srgb,var(--color-bg)_86%,transparent)_40%,color-mix(in_srgb,var(--color-bg)_58%,transparent)_56%,color-mix(in_srgb,var(--color-bg)_18%,transparent)_70%,transparent_82%)]"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-bg max-xl:hidden" />

      <div className="mx-auto w-full max-w-6xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 xl:py-20">
        <div className="max-w-2xl">
          <p {...rise(0)} className="anim-rise">
            <span className="console-label inline-flex items-center gap-2 text-amber">
              <span aria-hidden className="h-px w-6 bg-amber max-sm:hidden" />
              NASA Space Apps 2026 · Flame in Freefall
            </span>
          </p>
          <h1 {...rise(1)} className="anim-rise display mt-6 text-[clamp(44px,6.2vw,78px)]">
            <span className="text-lit">What NASA saw.</span>
            <br />
            <span className="text-lit-dim">Nothing it didn&apos;t.</span>
          </h1>
          <p {...rise(2)} className="anim-rise mt-7 max-w-lg text-[17px] leading-[1.65] text-dim sm:text-[18px]">
            Describe a spacecraft fire scenario in mission terms. IGNIS retrieves the closest verified NASA
            microgravity combustion experiments, explains what they actually observed — and marks where the current
            catalog has no matching evidence.
          </p>
          <div {...rise(3)} className="anim-rise mt-9 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" icon="play" glow onClick={() => scrollToId('guided-demo')}>
              See the guided demo
            </Button>
            <Button variant="ghost" size="lg" iconRight="arrow-right" onClick={() => scrollToId('how-it-works')}>
              How it works
            </Button>
          </div>
          <ul {...rise(4)} className="anim-rise mt-12 flex flex-wrap gap-x-6 gap-y-2">
            {['Solid flammability only', 'Every claim checked against its card', 'Gaps shown, never guessed'].map((t) => (
              <li key={t} className="console-label flex items-center gap-2 text-dim">
                <Icon name="verify" size={14} className="text-success" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* The art: a framed window below the copy (< xl), the full-bleed hero background (xl+). Decor only. */}
        <figure
          {...rise(5)}
          className="anim-rise surface relative mt-14 overflow-hidden rounded-panel border border-border xl:absolute xl:animate-none xl:inset-0 xl:-z-20 xl:mt-0 xl:rounded-none xl:border-0 xl:bg-transparent xl:shadow-none"
        >
          {/* LCP image: eager, high priority, preloaded in index.html with the same srcset + sizes. */}
          <img
            src="/art/hero-ops-room.webp"
            srcSet="/art/hero-ops-room-sm.webp 960w, /art/hero-ops-room.webp 1672w"
            sizes="(min-width: 1280px) 100vw, 92vw"
            width={1672}
            height={941}
            alt=""
            aria-hidden
            {...{ fetchpriority: 'high' }} /* lowercase: React 18 passes it straight to the DOM */
            decoding="async"
            className="hero-drift aspect-[16/10] w-full origin-[68%_35%] object-cover object-[66%_center] xl:aspect-auto xl:size-full xl:object-[68%_center]"
          />
          {/* Inner vignette so the window reads as depth, not a pasted photo (hidden on xl: the scrim does that job). */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_60px_10px_color-mix(in_srgb,var(--color-bg)_70%,transparent)] xl:hidden"
          />
          <figcaption className="console-label absolute right-4 bottom-3 text-dim xl:bottom-4 xl:right-6">Illustration</figcaption>
        </figure>
      </div>
    </section>
  );
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
}

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

/* -------------------------------------------------------------------------- */

const STEPS: { icon: IconName; tag: string; title: string; lines: [string, string] }[] = [
  {
    icon: 'scenario',
    tag: '01 · Describe',
    title: 'Mission terms in',
    lines: [
      'Describe a spacecraft fire scenario the way a crew would.',
      'You confirm the parsed conditions and the resolved material before anything runs.',
    ],
  },
  {
    icon: 'map-scatter',
    tag: '02 · Retrieve',
    title: 'Verified experiments out',
    lines: [
      'Deterministic gates and similarity select the closest verified NASA experiments.',
      'No AI touches eligibility or ranking.',
    ],
  },
  {
    icon: 'evidence',
    tag: '03 · Explain',
    title: 'Claims checked at the source',
    lines: [
      'Observed and supported statements cite the retrieved experiments.',
      'The server checks every cited value against its card and withholds statements that fail. Interpretation stays labeled as interpretation.',
    ],
  },
  {
    icon: 'gap',
    tag: '04 · Gaps',
    title: 'Absence made visible',
    lines: ['Where nothing matches, IGNIS says so plainly — never filled in:', `“${COPY.absence}”`],
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="surface reveal relative isolate mx-auto max-w-6xl overflow-hidden rounded-panel border border-border">
        {/* Decorative constellation (kept off the Evidence Map: its dots read as data). Desktop only, masked to the
            top-right corner so no dot sits behind a word; the step cards are near-opaque on top. */}
        <img
          src="/art/bg-constellation.webp"
          width={1672}
          height={941}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 size-full object-cover object-right opacity-80 max-lg:hidden [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent_35%,black_80%),linear-gradient(to_bottom,black_0%,black_28%,transparent_48%)]"
        />
        <div className="p-6 sm:p-10">
          <span className="console-label text-amber">How IGNIS works</span>
          <h2 id="how-title" className="display text-lit mt-4 max-w-xl text-[clamp(30px,3.6vw,44px)] leading-[1.06]">
            An evidence catalog, not a simulator.
          </h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li
                key={s.tag}
                style={{ '--i': i } as CSSProperties}
                className="surface-inset reveal flex flex-col gap-4 rounded-2xl border border-border/80 bg-bg/92 p-5 backdrop-blur-md"
              >
                <span className="surface grid size-10 place-items-center rounded-xl border border-border text-amber">
                  <Icon name={s.icon} size={19} />
                </span>
                <div>
                  <span className="console-label text-dim">{s.tag}</span>
                  <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.015em]">{s.title}</h3>
                </div>
                <p className="text-[14px] leading-[1.6] text-dim">
                  {s.lines[0]} <span className="text-text">{s.lines[1]}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function CatalogSection() {
  const { summary, retry } = useCatalogSummary();
  return (
    <div id="catalog" className="scroll-mt-20 px-4 pb-20 sm:px-6">
      <div className="reveal mx-auto max-w-6xl">
        <CatalogBlock summary={summary} retry={retry} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Principle() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <FlameSphereArt size={220} className="reveal justify-self-center" />
        <div>
          <div className="reveal">
            <span className="console-label text-amber">{t('oneIdea')}</span>
            <blockquote className="display text-lit mt-4 text-[clamp(26px,3vw,38px)] leading-[1.15] font-medium tracking-[-0.025em]">
              {t('refusesToGuess')}
            </blockquote>
          </div>
          {/* Brief-tone legend: static on purpose (decision 2) — no reveal on this grid. */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Panel tone="observed" className="!p-4">
              <span className="console-label text-success">Observed</span>
              <p className="mt-1.5 text-sm text-dim">{t('whatTestReported')}</p>
            </Panel>
            <Panel tone="interpretation" className="!p-4">
              <span className="console-label text-blue">Supported</span>
              <p className="mt-1.5 text-sm text-dim">{t('carefulReading')}</p>
            </Panel>
            <Panel tone="untested" className="!p-4">
              <span className="console-label text-warn">Untested</span>
              <p className="mt-1.5 text-sm text-dim">{t('noMatchingEvidence')}</p>
            </Panel>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function GuidedDemoPanel() {
  const [preset, setPreset] = useState<string>(PRESETS[0]);
  return (
    <section id="guided-demo" className="scroll-mt-20 px-4 pb-16 sm:px-6">
      <div className="surface reveal relative isolate mx-auto max-w-6xl overflow-hidden rounded-panel border border-border">
        <img
          src="/art/bg-grid-accent.webp"
          width={1672}
          height={941}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          // Fade the art out toward the bottom so its amber diagonal never runs through the preset pills;
          // hidden on narrow screens, where the stretched diagonal would cross the copy.
          className="absolute inset-0 -z-10 size-full object-cover object-right max-md:hidden [mask-image:linear-gradient(to_bottom,black_0%,black_30%,transparent_68%)]"
        />
        <div className="flex flex-col gap-8 p-6 sm:p-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md">
            <Badge variant="amber">{t('judgeMode')}</Badge>
            <h2 className="display text-lit mt-5 text-[clamp(28px,3.2vw,38px)] leading-[1.08]">{t('goldenPath')}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-dim">{t('guidedDemoDescription')}</p>
            {/* Coder B wires the guided run (R3 writes the captions). */}
            <Button variant="primary" size="lg" icon="play" className="mt-6" disabled aria-describedby="guided-demo-availability">
              {t('runGuidedDemo')}
            </Button>
            {/* Visible availability, not a tooltip: the run needs the console (Coder B) and R1's first verified cards. */}
            <p id="guided-demo-availability" className="mt-3 text-[13px] leading-snug text-dim">
              {t('guidedDemoAvailability')}
            </p>
          </div>
          {/* Presets sit in their own frosted tray: a calm, solid ground under the pills. */}
          <div className="surface-inset w-full max-w-md rounded-2xl border border-border/70 p-4 backdrop-blur-md md:w-auto">
            <p className="console-label mb-3 text-dim">{t('orPickPreset')}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('scenarioPresets')}>
              {PRESETS.map((p) => (
                <PresetChip key={p} active={preset === p} onClick={() => setPreset(p)}>
                  {p}
                </PresetChip>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function ConsoleSkeleton() {
  const { catalog, reload } = useVerifiedCatalog();
  const catalogExperiments = catalog.state === 'ready' ? catalog.experiments : [];
  const experiments = catalogExperiments;
  const hasCatalogSnapshot = catalog.state === 'ready' || catalog.state === 'empty';
  const revision = hasCatalogSnapshot ? catalog.revision : 'pending';
  const dataStatus = hasCatalogSnapshot ? 'connected' : catalog.state === 'unavailable' ? 'unavailable' : 'loading';
  const [presetId, setPresetId] = useState<string | null>(SCENARIO_PRESETS[0]?.id ?? null);
  const [scenario, setScenario] = useState<ParsedScenario>(() => ({
    domain: 'solid_flammability',
    fuel_material_raw: SCENARIO_PRESETS[0]?.material?.fuel_material ?? null,
    fuel_form: SCENARIO_PRESETS[0]?.fuel_form ?? null,
    thickness_mm: SCENARIO_PRESETS[0]?.thickness_mm ?? null,
    o2_pct: SCENARIO_PRESETS[0]?.o2_pct ?? 21,
    flow_cm_s: SCENARIO_PRESETS[0]?.flow_cm_s ?? null,
    pressure_kpa: SCENARIO_PRESETS[0]?.pressure_kpa ?? null,
  }));
  const [materialChoice, setMaterialChoice] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ResolvedScenario | null>(null);
  const [description, setDescription] = useState('');
  const [parsing, setParsing] = useState(false);
  const [message, setMessage] = useState('');
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
      key: JSON.stringify({ scenario: confirmed, catalog_revision: revision, experiment_ids }),
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

  const activeBriefing = briefingRequest && briefingResult?.key === briefingRequest.key ? briefingResult.data : null;
  const activeBriefStatus = briefingRequest
    ? briefingStatus?.key === briefingRequest.key ? briefingStatus.state : 'waiting'
    : 'idle';
  const closestMatch = confirmed ? views?.top_k[0] ?? null : null;
  const outsideParams = views?.coverage?.params.filter((param) => param.state === 'outside_catalog_range') ?? [];

  function editScenario(update: Partial<ParsedScenario>, materialEdited = false) {
    setScenario((current) => ({ ...current, ...update }));
    setConfirmed(null);
    setMessage('');
    if (materialEdited) {
      setPresetId(null);
      setMaterialChoice(null);
    }
  }

  function moveSlider(update: Partial<Pick<ParsedScenario, 'o2_pct' | 'flow_cm_s'>>) {
    setScenario((current) => ({ ...current, ...update }));
    setConfirmed((current) => current ? { ...current, ...update } : null);
    setMessage('');
  }

  function choosePreset(id: string) {
    const preset = SCENARIO_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    const value = presetScenario(preset, sourceMaterials);
    setPresetId(id);
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
  }

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
            <details className="rounded-xl border border-border bg-bg/35 p-3">
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
                      editScenario({ fuel_material_raw: null, fuel_form: null, thickness_mm: null, o2_pct: 21, flow_cm_s: null, pressure_kpa: null }, true);
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
                    ) : <p>{t('noVerifiedMaterials')}</p>}
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
            <Slider label="O₂" unit="%" min={14} max={30} value={scenario.o2_pct ?? 21} onChange={(value) => moveSlider({ o2_pct: value })} />
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
        <EvidenceMap key={revision} experiments={views?.eligible ?? experiments} scenario={confirmed} matches={views?.top_k ?? []} status={dataStatus} />
      </Panel>

      <div className="grid gap-6">
        <Panel as="section" aria-labelledby="s3" className="reveal">
        <SectionHeader id="s3" step={t('matchesStep')} title={t('matchPanel')} />
          <MatchPanel matches={views?.top_k ?? []} status={dataStatus} confirmed={confirmed !== null} />
        </Panel>
        <Panel as="section" aria-labelledby="s4">
          <SectionHeader id="s4" step={t('briefStep')} title={t('missionBrief')} />
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
        <GapRadarPanel data={radar} status={dataStatus} scenarioActive={confirmed !== null} />
      </Panel>
    </div>
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
                  onClick={() => setSelectedId(experiment.id)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(experiment.id); } }}
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
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-bg/55 p-4">
              <div>
                <p className="console-label text-amber">{selected.campaign} · {selected.test_id}</p>
                <p className="mt-1 text-sm text-text">{selected.outcome ?? 'Outcome not reported'} · {selected.o2_pct}% O₂ · {selected.flow_cm_s} cm/s</p>
              </div>
              {(nasaPdfUrl(selected) || selected.source_url) && <a href={nasaPdfUrl(selected) ?? selected.source_url} target="_blank" rel="noreferrer" className="text-sm text-amber underline underline-offset-4">{nasaPdfUrl(selected) ? 'NASA paper PDF' : 'Source'}</a>}
            </div>
          )}
          {grid.plotted < grid.population && <p className="mt-3 text-[13px] text-dim">{grid.population - grid.plotted} {grid.population - grid.plotted === 1 ? t('record') : t('records')} {t('untestedSourceRecords')}</p>}
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
    <div className="grid gap-3 lg:grid-cols-3">
      {matches.map((match, index) => {
        const why = whyMatched(match);
        const { experiment } = match;
        const provenance = [experiment.source_page != null ? `p. ${experiment.source_page}` : null, experiment.source_figure, experiment.source_table].filter(Boolean).join(' · ');
        return (
          <article key={experiment.id} id={`experiment-${experiment.id}`} className="rounded-xl border border-border bg-bg/45 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="console-label text-amber">{t('match')} {index + 1}</span>
                <h3 className="mt-1 text-base font-semibold text-text">{experimentLabel(experiment)}</h3>
              </div>
              {experiment.outcome ? <Badge variant={experiment.outcome} /> : <Badge variant="neutral">{t('outcomeNotReported')}</Badge>}
            </div>
            <p className="mt-3 text-sm text-dim">
              {experiment.o2_pct == null ? t('oxygenNotReported') : `${experiment.o2_pct}% O₂`}
              {' · '}
              {experiment.flow_cm_s == null ? t('airflowNotReported') : `${experiment.flow_cm_s} cm/s airflow`}
            </p>
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
              </details>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-[13px]">
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

function Footer() {
  const { summary } = useCatalogSummary();
  return (
    <footer className="border-t border-border/70 px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 text-[13px] text-dim md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2 text-text">
            <img src="/art/logo-flame-64.webp" width={20} height={20} alt="" aria-hidden loading="lazy" className="size-5 rounded-full" />
            <span className="font-semibold tracking-[0.14em]">IGNIS</span>
            <span className="text-dim">by Team AstroFlare · NASA Space Apps 2026</span>
          </p>
          <p>
            {t('experimentDataSources')}
          </p>
          <p>{t('nasaDisclaimer')}</p>
          <p>{t('brandingArt')}</p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          {/* Open dataset export (§8.1 item 6): verified cards only, honest README-only file when empty. */}
          <ExportButton summary={summary} label={t('openDataset')} />
          <a href="#top" className="console-label text-dim transition-colors duration-200 can-hover:hover:text-text">
            {t('backToTop')}
          </a>
        </div>
      </div>
    </footer>
  );
}
