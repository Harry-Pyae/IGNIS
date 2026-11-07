import { useCatalogSummary } from '../lib/catalog';
import { Button, Icon } from './ui';

/** App shell header: brand mark + wordmark (left), provenance pill + export (right). */
export function AppHeader() {
  const catalog = useCatalogSummary();
  const provenance =
    catalog.state === 'ready'
      ? `${catalog.experiments} verified experiments · ${catalog.campaigns.length} NASA campaigns · NTRS / PSI`
      : catalog.state === 'offline'
        ? 'Catalog offline · NTRS / PSI sources'
        : 'Loading verified catalog…';

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5" aria-label="IGNIS home">
          {/* Interim brand mark (art pack). One <img>, never a CSS background. */}
          <img src="/art/logo-flame.webp" width={30} height={30} alt="" aria-hidden className="size-[30px] rounded-full" />
          <span className="text-[17px] font-bold tracking-[0.18em]">IGNIS</span>
          <span className="console-label hidden text-dim md:inline">Mission console</span>
        </a>

        <div className="ml-auto flex items-center gap-2">
          {/* Provenance pill (§8.1 item 0). Part 3 expands it into the campaign/source panel. */}
          <span
            className="console-label hidden items-center gap-2 rounded-full border border-border bg-panel/80 px-3 py-1.5 text-dim tracking-[0.08em] sm:inline-flex"
            aria-live="polite"
          >
            <Icon name="provenance" size={14} className="text-amber" />
            {provenance}
          </span>
          {/* §8.1 item 6. Part 2 builds the export endpoint; enable once it lands. */}
          <Button size="sm" variant="secondary" icon="download" disabled title="Open dataset export lands with Part 2">
            <span className="hidden sm:inline">Export dataset</span>
            <span className="sr-only sm:hidden">Export dataset</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
