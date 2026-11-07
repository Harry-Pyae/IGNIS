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

/** §8.1 Scenario Builder templates. Presets carry their explicit material mapping (§5a) — Part 2/3 wire them. */
const PRESETS = [
  'Cabin wall panel (PMMA)',
  'Cable insulation',
  'Crew clothing (cotton blend)',
  'Cargo packaging',
  'Custom',
] as const;

const NO_PREDICTION_CAPTION = 'Slider changes which NASA evidence is retrieved — IGNIS does not predict behavior.';

export function Home() {
  return (
    <main id="top">
      <Hero />
      <HowItWorks />
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
    <section className="relative isolate flex min-h-[min(86svh,760px)] items-center overflow-hidden">
      {/* LCP image: eager, high priority, preloaded in index.html with the same srcset. Decor only. */}
      <img
        src="/art/hero-ops-room.webp"
        srcSet="/art/hero-ops-room-sm.webp 960w, /art/hero-ops-room.webp 1672w"
        sizes="100vw"
        width={1672}
        height={941}
        alt=""
        aria-hidden
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-20 size-full object-cover object-[68%_center]"
      />
      {/* Left scrim rgba(12,15,22,.82) → transparent keeps §8.3 text contrast; bottom fade melts into the page. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-bg)_82%,transparent)_0%,color-mix(in_srgb,var(--color-bg)_62%,transparent)_42%,transparent_78%)] max-md:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-bg)_55%,transparent)_0%,color-mix(in_srgb,var(--color-bg)_82%,transparent)_100%)]"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-bg" />

      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-xl">
          <p {...rise(0)} className="anim-rise">
            <span className="console-label inline-flex items-center gap-2 text-amber">
              <span aria-hidden className="h-px w-6 bg-amber max-sm:hidden" />
              NASA Space Apps 2026 · Flame in Freefall
            </span>
          </p>
          <h1 {...rise(1)} className="anim-rise mt-5 text-[44px] leading-[1.02] font-bold tracking-[-0.02em] sm:text-6xl">
            What NASA saw.
            <br />
            <span className="text-dim">Nothing it didn&apos;t.</span>
          </h1>
          <p {...rise(2)} className="anim-rise mt-6 max-w-lg text-[17px] leading-relaxed text-dim">
            Describe a spacecraft fire scenario in mission terms. IGNIS retrieves NASA&apos;s closest real
            microgravity combustion experiments, explains what was actually observed — and explicitly shows what NASA
            has never tested.
          </p>
          <div {...rise(3)} className="anim-rise mt-9 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" icon="play" glow onClick={() => scrollToId('guided-demo')}>
              Run the guided demo
            </Button>
            <Button variant="ghost" size="lg" iconRight="arrow-right" onClick={() => scrollToId('how-it-works')}>
              How it works
            </Button>
          </div>
          <ul {...rise(4)} className="anim-rise mt-12 flex flex-wrap gap-x-6 gap-y-2">
            {['Solid flammability only', 'Every claim cited', 'Untested shown, never guessed'].map((t) => (
              <li key={t} className="console-label flex items-center gap-2 text-dim">
                <Icon name="verify" size={14} className="text-success" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <span className="console-label absolute right-4 bottom-4 text-dim sm:right-6">Illustration</span>
    </section>
  );
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
}

/* -------------------------------------------------------------------------- */

const STEPS: { icon: IconName; tag: string; title: string; body: string }[] = [
  {
    icon: 'scenario',
    tag: '01 · Describe',
    title: 'Mission terms in',
    body: '“Flight suit near a vent, 21% O₂.” You confirm the parsed parameters before anything runs.',
  },
  {
    icon: 'map-scatter',
    tag: '02 · Retrieve',
    title: 'Real burn tests out',
    body: 'Deterministic gates and similarity pick the closest verified BASS, Saffire and SoFIE experiments — no AI in the ranking.',
  },
  {
    icon: 'gap',
    tag: '03 · Refuse to guess',
    title: 'Gaps made visible',
    body: 'Where NASA never tested, IGNIS says UNTESTED. Every AI sentence must cite a card or it is withheld.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-panel border border-border bg-panel">
        {/* Decorative constellation (moved here from the Evidence Map: its orange/blue dots read as data). */}
        <img
          src="/art/bg-constellation.webp"
          width={1672}
          height={941}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 size-full object-cover object-right opacity-90 max-md:opacity-35"
        />
        <div className="max-w-xl p-6 sm:p-10">
          <span className="console-label text-amber">How it works</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.01em] sm:text-4xl">
            An evidence catalog, not a simulator.
          </h2>
          <ol className="mt-8 flex flex-col gap-6">
            {STEPS.map((s) => (
              <li key={s.tag} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-bg/70 text-amber">
                  <Icon name={s.icon} size={19} />
                </span>
                <div>
                  <span className="console-label text-dim">{s.tag}</span>
                  <h3 className="text-[17px] font-semibold">{s.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-dim">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Principle() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <FlameSphereArt size={220} className="justify-self-center" />
        <div>
          <span className="console-label text-amber">The one idea</span>
          <blockquote className="mt-3 text-2xl leading-snug font-medium sm:text-[32px]">
            IGNIS refuses to guess. It renders the absence of evidence as a visible, first-class feature.
          </blockquote>
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
              <p className="mt-1.5 text-sm text-dim">No evidence. Shown, never filled in.</p>
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
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-panel border border-border">
        <img
          src="/art/bg-grid-accent.webp"
          width={1672}
          height={941}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 size-full object-cover object-right"
        />
        <div className="flex flex-col gap-8 p-6 sm:p-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md">
            <Badge variant="amber">Judge mode</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.01em]">See the golden path in 60 seconds.</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-dim">
              The guided demo runs the cabin-wall scenario end to end with a caption at every step — or pick a preset
              and explore on your own.
            </p>
            {/* Part 3 wires the guided run (Part 6 writes the captions). */}
            <Button variant="primary" size="lg" icon="play" className="mt-6" disabled title="Guided demo lands with Part 3">
              Run the guided demo
            </Button>
          </div>
          <div className="flex max-w-md flex-wrap gap-2 md:justify-end" role="group" aria-label="Scenario presets">
            {PRESETS.map((p) => (
              <PresetChip key={p} active={preset === p} onClick={() => setPreset(p)}>
                {p}
              </PresetChip>
            ))}
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
      <Panel as="section" aria-labelledby="s1">
        <SectionHeader id="s1" step="01 · Describe" title="Mission scenario" aside={<Scaffold owner="part3-console" />} />
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
            <p className="console-label text-dim">Chip language preview · values arrive from part2-engine</p>
          </div>
          <div className="flex flex-col gap-5">
            <Slider label="O₂" unit="%" min={14} max={30} value={o2} onChange={setO2} />
            <Slider label="Airflow" unit="cm/s" min={0} max={30} value={flow} onChange={setFlow} />
            <p className="text-[13px] text-dim">{NO_PREDICTION_CAPTION}</p>
          </div>
        </div>
      </Panel>

      <Panel as="section" aria-labelledby="s2">
        <SectionHeader
          id="s2"
          step="02 · Retrieve"
          title="Evidence map"
          aside={
            <>
              <Badge variant="live" />
              <Scaffold owner="part3-console" />
            </>
          }
        />
        <EmptyState icon="map-scatter" title="The Evidence Map renders here">
          Verified experiments plotted by airflow × O₂, the scenario marker, match lines and hatched untested cells.
        </EmptyState>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel as="section" aria-labelledby="s3">
          <SectionHeader id="s3" step="03 · Why these" title="Match panel" aside={<Scaffold owner="part3" />} />
          <EmptyState icon="match" title="Top matches appear here">
            Each card: chips, WHY THIS MATCHED, outcome, source and provenance. “Matched N of M parameters.”
          </EmptyState>
        </Panel>
        <Panel as="section" aria-labelledby="s4">
          <SectionHeader id="s4" step="04 · Evidence-validated claims" title="Mission brief" aside={<Scaffold owner="part3" />} />
          <EmptyState icon="evidence" title="Validated claims appear here">
            Observed · Supported interpretation · Untested — every citation checked on the server first.
          </EmptyState>
        </Panel>
      </div>

      <Panel as="section" aria-labelledby="s5">
        <SectionHeader id="s5" step="05 · Research prioritization" title="Evidence gap radar" aside={<Scaffold owner="part3" />} />
        <EmptyState icon="gap" title="The largest untested regions appear here">
          Untested regions are not necessarily unsafe — they are unstudied. IGNIS marks them as candidate areas for
          future NASA testing.
        </EmptyState>
      </Panel>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/70 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 text-[13px] text-dim sm:flex-row sm:items-center sm:justify-between">
        <p>
          Evidence from NASA NTRS and PSI sources. Illustrations on this page are branding — not NASA experiment
          imagery.
        </p>
        <a href="#top" className="console-label text-dim can-hover:hover:text-text">
          Back to top
        </a>
      </div>
    </footer>
  );
}
