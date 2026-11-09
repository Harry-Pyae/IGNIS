import { useState, type CSSProperties } from 'react';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  FlameSphereArt,
  Icon,
  Panel,
  PresetChip,
  SectionHeader,
  Slider,
  type IconName,
} from '../components/ui';
import { CatalogBlock, ExportButton } from '../components/CatalogStatus';
import { useCatalogSummary } from '../lib/catalog';
import { COPY } from '../lib/copy';

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
            <span className="console-label text-amber">The one idea</span>
            <blockquote className="display text-lit mt-4 text-[clamp(26px,3vw,38px)] leading-[1.15] font-medium tracking-[-0.025em]">
              IGNIS refuses to guess. It renders the absence of evidence as a visible, first-class feature.
            </blockquote>
          </div>
          {/* Brief-tone legend: static on purpose (decision 2) — no reveal on this grid. */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Panel tone="observed" className="!p-4">
              <span className="console-label text-success">Observed</span>
              <p className="mt-1.5 text-sm text-dim">What a NASA test directly reported.</p>
            </Panel>
            <Panel tone="interpretation" className="!p-4">
              <span className="console-label text-blue">Supported</span>
              <p className="mt-1.5 text-sm text-dim">Careful reading across cited tests.</p>
            </Panel>
            <Panel tone="untested" className="!p-4">
              <span className="console-label text-warn">Untested</span>
              <p className="mt-1.5 text-sm text-dim">No matching verified evidence in the current catalog. Shown, never filled in.</p>
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
            <Badge variant="amber">Judge mode</Badge>
            <h2 className="display text-lit mt-5 text-[clamp(28px,3.2vw,38px)] leading-[1.08]">See the golden path in 60 seconds.</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-dim">
              The guided demo runs one rehearsed scenario, chosen from what the verified catalog actually covers, end to
              end with a caption at every step — or pick a preset and explore on your own.
            </p>
            {/* Coder B wires the guided run (R3 writes the captions). */}
            <Button variant="primary" size="lg" icon="play" className="mt-6" disabled aria-describedby="guided-demo-availability">
              Run the guided demo
            </Button>
            {/* Visible availability, not a tooltip: the run needs the console (Coder B) and R1's first verified cards. */}
            <p id="guided-demo-availability" className="mt-3 text-[13px] leading-snug text-dim">
              Opens once the mission console and the first verified NASA cards are live.
            </p>
          </div>
          {/* Presets sit in their own frosted tray: a calm, solid ground under the pills. */}
          <div className="surface-inset w-full max-w-md rounded-2xl border border-border/70 p-4 backdrop-blur-md md:w-auto">
            <p className="console-label mb-3 text-dim">Or pick a preset</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Scenario presets">
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

function Scaffold({ owner }: { owner: string }) {
  return <Badge variant="neutral">Scaffold · {owner}</Badge>;
}

function ConsoleSkeleton() {
  const [o2, setO2] = useState(21);
  const [flow, setFlow] = useState(10);
  return (
    <div id="console" className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-24 sm:px-6">
      <Panel as="section" aria-labelledby="s1" className="reveal">
        <SectionHeader id="s1" step="01 · Describe" title="Mission scenario" aside={<Scaffold owner="Coder B" />} />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Chip status="exact" label="Material" />
              <Chip status="same" label="Oxygen" />
              <Chip status="close" label="Airflow" />
              <Chip status="not_reported" label="Thickness" />
              <Chip status="untested" label="Pressure" />
              <Chip status="outside_range" label="O₂ 32%" />
            </div>
            <p className="console-label text-dim">Chip language preview · values arrive from Coder A's engine</p>
          </div>
          <div className="flex flex-col gap-5">
            <Slider label="O₂" unit="%" min={14} max={30} value={o2} onChange={setO2} />
            <Slider label="Airflow" unit="cm/s" min={0} max={30} value={flow} onChange={setFlow} />
            <p className="text-[13px] text-dim">{COPY.sliderCaption}</p>
          </div>
        </div>
      </Panel>

      <Panel as="section" aria-labelledby="s2" className="reveal">
        <SectionHeader
          id="s2"
          step="02 · Retrieve"
          title="Evidence map"
          aside={<Scaffold owner="Coder B" />}
        />
        <EmptyState icon="map-scatter" title="The Evidence Map renders here">
          Verified experiments plotted by airflow × O₂, the scenario marker, match lines and hatched untested cells.
        </EmptyState>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel as="section" aria-labelledby="s3" className="reveal">
          <SectionHeader id="s3" step="03 · Why these" title="Match panel" aside={<Scaffold owner="Coder B" />} />
          <EmptyState icon="match" title="Top matches appear here">
            Each card: chips, WHY THIS MATCHED, outcome, source and provenance. “Matched N of M parameters.”
          </EmptyState>
        </Panel>
        <Panel as="section" aria-labelledby="s4">
          <SectionHeader id="s4" step="04 · Evidence-validated claims" title="Mission brief" aside={<Scaffold owner="Coder B" />} />
          <EmptyState icon="evidence" title="Validated claims appear here">
            Observed · Supported interpretation · Untested. {COPY.claimsGuarantee}
          </EmptyState>
        </Panel>
      </div>

      <Panel as="section" aria-labelledby="s5" className="reveal">
        <SectionHeader id="s5" step="05 · Research prioritization" title="Evidence gap radar" aside={<Scaffold owner="Coder B" />} />
        <EmptyState icon="gap" title="The largest untested regions appear here">
          {COPY.gapNote}
        </EmptyState>
      </Panel>
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
            Experiment data: NASA Technical Reports Server (NTRS) and NASA Physical Sciences Informatics (PSI). Each card
            links to and credits its own source.
          </p>
          <p>IGNIS is an independent NASA Space Apps project. Not affiliated with or endorsed by NASA.</p>
          <p>Illustrations on this page are branding — not NASA experiment imagery.</p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          {/* Open dataset export (§8.1 item 6): verified cards only, honest README-only file when empty. */}
          <ExportButton summary={summary} label="Open dataset (.json)" />
          <a href="#top" className="console-label text-dim transition-colors duration-200 can-hover:hover:text-text">
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}
