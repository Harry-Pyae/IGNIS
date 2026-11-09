/**
 * Live catalog status: the header provenance pill and the landing "Catalog" block.
 * Presentational — pass a CatalogSummary (from useCatalogSummary, or a fixture in /kit). OWNER: Coder A.
 */
import { useState } from 'react';
import { type CatalogSummary, catalogLine } from '../lib/catalog';
import { cx } from '../lib/cx';
import { downloadCatalogExport } from '../lib/exportDownload';
import { Badge, Button, Icon, Panel } from './ui';

const date = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso)) : '—';

/** Header provenance pill (§8.1 item 0) — visible at every width; compact below sm. */
export function ProvenancePill({ summary, retry }: { summary: CatalogSummary; retry?: () => void }) {
  const failed = summary.state === 'unavailable' && summary.reason === 'error';
  return (
    <span
      className="console-label inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-panel/80 px-3 py-1.5 tracking-[0.08em] text-dim"
      aria-live="polite"
    >
      <Icon name={failed ? 'withheld' : 'provenance'} size={14} className={failed ? 'text-warn' : 'text-amber'} />
      <span key={catalogLine(summary, true)} className="swap-in truncate sm:hidden">
        {catalogLine(summary, true)}
      </span>
      <span key={catalogLine(summary)} className="swap-in hidden truncate sm:inline">
        {catalogLine(summary)}
      </span>
      {failed && retry && (
        <button type="button" onClick={retry} className="text-amber underline-offset-4 transition-[text-decoration-color] duration-200 can-hover:hover:underline">
          Retry
        </button>
      )}
    </span>
  );
}

function Stat({ value, label, muted }: { value: string; label: string; muted?: boolean }) {
  return (
    <div className="surface-inset flex flex-col gap-3 rounded-2xl border border-border/70 p-4">
      <span
        key={value}
        className={cx('swap-in text-[40px] leading-none font-semibold tracking-[-0.03em] tabular-nums', muted ? 'text-faint' : 'text-lit')}
      >
        {value}
      </span>
      <span className="console-label text-dim">{label}</span>
    </div>
  );
}

/** Landing "Catalog" block: real counts, honest zero state, distinct unavailable state. */
export function CatalogBlock({ summary, retry }: { summary: CatalogSummary; retry?: () => void }) {
  const stats = summary.state === 'ready' ? summary.stats : null;
  const verified = stats?.verified ?? 0;
  return (
    <Panel as="section" aria-labelledby="catalog-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="console-label text-amber">The catalog</span>
          <h2 id="catalog-title" className="display text-lit mt-3 text-[clamp(26px,3vw,34px)] leading-[1.1]">
            Verified NASA experiments, nothing else.
          </h2>
          <p className="mt-2 max-w-xl text-[15px] text-dim">
            A card becomes public only after a named curator checks every field against its NASA source.
          </p>
        </div>
        {summary.state === 'ready' && verified === 0 && stats!.in_review > 0 && (
          // A status line, not a pill: it wraps cleanly at 390px and reads as state, not a button.
          <p
            key={stats!.in_review}
            className="swap-in flex max-w-full items-start gap-2.5 rounded-xl border border-warn/30 bg-warn/[0.07] px-3.5 py-2.5 text-[13px] leading-snug text-warn sm:max-w-xs"
          >
            <span aria-hidden className="mt-[5px] size-2 shrink-0 rounded-full bg-warn shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-warn)_18%,transparent)]" />
            <span>
              <span className="font-medium">Catalog in verification</span>
              <span className="text-dim"> — {stats!.in_review} card{stats!.in_review === 1 ? '' : 's'} in review</span>
            </span>
          </p>
        )}
      </div>

      {summary.state === 'unavailable' ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg/50 p-4 text-sm text-dim">
          <Icon name="withheld" size={18} className="text-warn" />
          {summary.reason === 'not_configured'
            ? 'The catalog database is not connected in this environment.'
            : 'The catalog could not be loaded right now. This is a connection problem, not an empty catalog.'}
          {summary.reason === 'error' && retry && (
            <Button size="sm" className="ml-auto" onClick={retry}>
              Retry
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy={summary.state === 'loading'}>
          <Stat value={stats ? String(stats.verified) : '—'} label="Verified experiments" muted={!stats || verified === 0} />
          <Stat value={stats ? String(stats.in_review) : '—'} label="Cards in review" muted={!stats} />
          <Stat value={stats ? String(stats.campaigns.length) : '—'} label="NASA campaigns" muted={!stats || verified === 0} />
          <div className="surface-inset flex flex-col justify-between gap-3 rounded-2xl border border-border/70 p-4">
            <span
              key={stats?.last_updated ?? 'none'}
              className="swap-in text-[20px] leading-tight font-semibold tracking-[-0.02em] text-text tabular-nums"
            >
              {date(stats?.last_updated ?? null)}
            </span>
            <span className="console-label text-dim">
              Last updated{stats && stats.revision !== 'empty' ? ` · rev ${stats.revision.slice(0, 7)}` : ''}
            </span>
          </div>
        </div>
      )}

      {stats && stats.campaigns.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Campaigns in the verified catalog">
          {stats.campaigns.map((c) => (
            <li key={c}>
              <Badge>{c}</Badge>
            </li>
          ))}
        </ul>
      )}
      <p className="console-label text-dim">Sources · NASA Technical Reports Server (NTRS) · Physical Sciences Informatics (PSI)</p>
    </Panel>
  );
}

/**
 * "Export Open Dataset (.json)" (§8.1 item 6): downloads every verified card with its provenance
 * from /api/export. Zero verified cards → the honest README-only file, and the label says so.
 * Disabled only when the database is not connected in this environment.
 */
export function ExportButton({
  summary,
  label,
  compact = false,
  variant = 'secondary',
}: {
  summary: CatalogSummary;
  label: string;
  /** Header on small screens: icon only (the label stays for screen readers). */
  compact?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'failed' | 'rate_limited'>('idle');
  const notConnected = summary.state === 'unavailable' && summary.reason === 'not_configured';
  const verified = summary.state === 'ready' ? summary.stats.verified : null;
  const title = notConnected
    ? 'The catalog database is not connected in this environment'
    : state === 'rate_limited'
      ? 'Too many downloads — try again in a minute'
      : state === 'failed'
        ? 'The export could not be downloaded — try again'
        : verified === 0
          ? 'Downloads the schema README with 0 verified experiments — the catalog is still in verification'
          : 'Download every verified card with its NASA source provenance (.json)';
  const text = state === 'busy' ? 'Preparing…' : state === 'failed' || state === 'rate_limited' ? 'Export failed — retry' : label;
  const run = async () => {
    setState('busy');
    const r = await downloadCatalogExport();
    setState(r.ok ? 'idle' : r.reason === 'rate_limited' ? 'rate_limited' : 'failed');
  };
  return (
    <Button size="sm" variant={variant} icon="download" disabled={notConnected || state === 'busy'} title={title} onClick={run} aria-live="polite">
      {compact ? (
        <>
          <span className="hidden md:inline">{text}</span>
          <span className="sr-only md:hidden">{text}</span>
        </>
      ) : (
        text
      )}
    </Button>
  );
}
