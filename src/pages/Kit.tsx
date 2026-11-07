import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  Badge,
  Button,
  CHIP_STATUS,
  Chip,
  CitationChip,
  EmptyState,
  ICON_NAMES,
  Icon,
  Panel,
  PresetChip,
  SectionHeader,
  Select,
  Slider,
} from '../components/ui';
import type { ChipStatus } from '../lib/types';

/** /kit — living reference of tokens + primitives for Part 3. Not linked from the public app. */

const COLORS = [
  'bg', 'panel', 'border', 'raised', 'text', 'dim', 'faint', 'amber', 'flame', 'blue', 'blue-badge', 'violet',
  'violet-badge', 'success', 'warn', 'observed-bg', 'observed-border', 'interp-bg', 'interp-border', 'untested-bg',
  'untested-border',
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel as="section">
      <h2 className="console-label mb-4 text-amber">{title}</h2>
      {children}
    </Panel>
  );
}

export function Kit() {
  const [o2, setO2] = useState(21);
  const [active, setActive] = useState('Cabin wall panel (PMMA)');
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <span className="console-label text-amber">Design kit</span>
        <h1 className="mt-2 text-3xl font-semibold">IGNIS primitives</h1>
        <p className="mt-2 text-dim">
          Import from <code className="font-mono text-text">src/components/ui</code>. Tokens live in{' '}
          <code className="font-mono text-text">src/styles/tokens.css</code>.
        </p>
      </div>

      <Block title="Color tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {COLORS.map((c) => (
            <div key={c} className="flex flex-col gap-1.5">
              <span
                className="h-12 rounded-lg border border-border"
                style={{ background: `var(--color-${c})` } as CSSProperties}
              />
              <code className="font-mono text-[11px] text-dim">{c}</code>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Type">
        <p className="text-4xl font-bold tracking-[-0.02em]">Space Grotesk — UI</p>
        <p className="console-label mt-3 text-dim">IBM Plex Mono — console labels · readouts · chips</p>
        <p className="mt-3 font-mono text-sm text-text tabular-nums">O₂ 21.0 % · FLOW 10 cm/s · 101.325 kPa</p>
      </Block>

      <Block title="Section header">
        <SectionHeader step="01 · Describe" title="Mission scenario" aside={<Badge variant="live" />} />
      </Block>

      <Block title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" icon="play" glow>
            Run the guided demo
          </Button>
          <Button variant="primary">Primary</Button>
          <Button icon="download">Export dataset</Button>
          <Button variant="ghost" iconRight="arrow-right">
            Ghost
          </Button>
          <Button size="sm">Small</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Block>

      <Block title="Chips — fixed symbol language">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CHIP_STATUS) as ChipStatus[]).map((s) => (
            <Chip key={s} status={s} label="Oxygen" />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Cabin wall panel (PMMA)', 'Cable insulation', 'Custom'].map((p) => (
            <PresetChip key={p} active={active === p} onClick={() => setActive(p)}>
              {p}
            </PresetChip>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-dim">
          Citation chips:
          <CitationChip evidenceId="E1" />
          <CitationChip evidenceId="E3" />
        </div>
      </Block>

      <Block title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge variant="sustained" />
          <Badge variant="extinguished" />
          <Badge variant="transition" />
          <Badge variant="partial" />
          <Badge variant="live" />
          <Badge variant="amber">Judge mode</Badge>
          <Badge variant="warn">2 statements withheld</Badge>
          <Badge>Neutral</Badge>
        </div>
      </Block>

      <Block title="Panels (brief tones never animate)">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Panel interactive>Default · interactive</Panel>
          <Panel tone="raised">Raised / matched</Panel>
          <Panel tone="observed">Observed</Panel>
          <Panel tone="interpretation">Supported interpretation</Panel>
          <Panel tone="untested">Untested</Panel>
        </div>
      </Block>

      <Block title="Form controls">
        <div className="grid gap-6 sm:grid-cols-2">
          <Select
            label="Catalog material"
            placeholder="Material unresolved — select a catalog material"
            options={[
              { value: 'PMMA', label: 'PMMA (thermoplastic)' },
              { value: 'nomex', label: 'Nomex (aramid fabric)' },
            ]}
          />
          <Slider label="O₂" unit="%" min={14} max={30} value={o2} onChange={setO2} />
        </div>
      </Block>

      <Block title="Empty states">
        <div className="grid gap-3 sm:grid-cols-2">
          <Panel tone="raised" padded={false}>
            <EmptyState icon="match" title="No matches yet">
              Pick a preset to retrieve evidence.
            </EmptyState>
          </Panel>
          <Panel tone="raised" padded={false}>
            <EmptyState illustration title="Loading the catalog">
              App-level states only — never inside map, matches or brief.
            </EmptyState>
          </Panel>
        </div>
      </Block>

      <Block title={`Icons (${ICON_NAMES.length})`}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {ICON_NAMES.map((n) => (
            <div key={n} className="flex flex-col items-center gap-2 rounded-lg border border-border p-3 text-dim">
              <Icon name={n} size={22} className="text-text" />
              <code className="font-mono text-[10px]">{n}</code>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Motion inventory (static under prefers-reduced-motion)">
        <div className="flex flex-wrap items-center gap-10">
          <div className="relative grid size-16 place-items-center">
            <span className="anim-pulse-ring absolute size-6 rounded-full border-2 border-text/70" />
            <span className="anim-pulse-ring is-second absolute size-6 rounded-full border-2 border-text/70" />
            <span className="size-3 rounded-full bg-text" />
          </div>
          <svg width="140" height="20" aria-hidden>
            <line x1="0" y1="10" x2="140" y2="10" className="anim-ants" stroke="var(--color-amber)" strokeWidth="1.5" />
          </svg>
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="anim-flicker size-3 rounded-full bg-flame" style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
          <div className="relative size-16 overflow-hidden rounded-full border border-border">
            <span className="anim-radar absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,color-mix(in_srgb,var(--color-amber)_45%,transparent)_360deg)]" />
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border border-border py-2">
          <div className="anim-ticker flex w-max gap-8 font-mono text-[11px] text-dim">
            {[0, 1].map((k) => (
              <span key={k} className="flex gap-8" aria-hidden={k === 1}>
                {['BASS GMT96-T7', 'BASS GMT96-T8', 'BASS-II GMT45-T4', 'Telemetry ticker · 30s loop'].map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </Block>
    </main>
  );
}
