import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Button,
  FlameSphereArt,
  Icon,
  Panel,
  type IconName,
} from '../components/ui';
import { CatalogBlock, ExportButton } from '../components/CatalogStatus';
import { preloadVerifiedCatalog, useCatalogSummary, useVerifiedCatalog } from '../lib/catalog';
import { MISSION_CASE, missionEntry } from '../engine/mission';
import { COPY } from '../lib/copy';
import { t } from '../i18n';
import { isConsoleAnchor, requestConsole, requestGuidedMission, takePendingAnchor, watchConsole } from './consoleLoader';

export function Home() {
  return (
    <main id="top">
      <Hero />
      <HowItWorks />
      <CatalogSection />
      <Principle />
      <LazyConsole />
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
            {MISSION_CASE && <MissionStartControl />}
            {/* Explore is the primary action until a reviewed mission case exists (DECISIONS-ROUND6 #1). */}
            <Button variant={MISSION_CASE ? 'ghost' : 'primary'} size="lg" iconRight="arrow-right" glow={!MISSION_CASE} onClick={() => scrollToId('console')}>
              {COPY.landingCta.explore}
            </Button>
          </div>
          {!MISSION_CASE && <p {...rise(4)} className="anim-rise mt-3 max-w-lg text-[13px] leading-snug text-dim">{COPY.missionAvailability}</p>}
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

function MissionStartControl() {
  const { catalog } = useVerifiedCatalog();
  const entry = catalog.state === 'ready' || catalog.state === 'empty'
    ? missionEntry(catalog.state === 'ready' ? catalog.experiments : [])
    : null;
  if (entry?.state === 'available') {
    return <Button variant="primary" size="lg" icon="play" glow onClick={() => requestGuidedMission(entry.case.preset_id)}>{COPY.landingCta.mission}</Button>;
  }
  return <p role="status" className="max-w-lg text-[13px] leading-snug text-dim">{entry?.state === 'unavailable' ? entry.message : catalog.state === 'loading' ? t('catalogConnecting') : t('matchCatalogUnavailable')}</p>;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ block: 'start' });
  else if (isConsoleAnchor(id)) requestConsole(id); // console not mounted yet: load it, then scroll (ScrollToPending)
}

/* -------------------------------------------------------------------------- */

// The console lives in its own chunk (src/pages/Console.tsx): prefetched when idle, mounted near the viewport.
const loadConsole = () => import('./Console');
const Console = lazy(() => loadConsole().then((m) => ({ default: m.Console })));

function LazyConsole() {
  const slot = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(
    () =>
      watchConsole(slot.current!, {
        prefetch: () => {
          void loadConsole();
          preloadVerifiedCatalog(); // data ready before mount: the console renders settled, so nothing shifts
        },
        mount: () => setMounted(true),
      }),
    [],
  );
  return (
    <div ref={slot}>
      {mounted ? (
        <Suspense fallback={<ConsolePlaceholder />}>
          <Console />
          <ScrollToPending />
        </Suspense>
      ) : (
        <ConsolePlaceholder />
      )}
    </div>
  );
}

/**
 * Static stand-in with the console's measured empty-catalog height per breakpoint (#console incl. its pb-24:
 * 1726 / 1579 / 1367 px at 390 / 768 / 1024+), so mounting shifts nothing. Re-measure if the console's layout changes.
 */
function ConsolePlaceholder() {
  return (
    <div aria-busy="true" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="min-h-[1630px] rounded-panel border border-border/60 bg-panel/30 md:min-h-[1483px] lg:min-h-[1271px]" />
    </div>
  );
}

/** Runs once the console is in the DOM: finish a deep link or scrollToId() that asked for a console anchor. */
function ScrollToPending() {
  useEffect(() => {
    const id = takePendingAnchor();
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, []);
  return null;
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

/* -------------------------------------------------------------------------- */

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
