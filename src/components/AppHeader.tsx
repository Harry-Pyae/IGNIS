import { useCatalogSummary } from '../lib/catalog';
import { ProvenancePill } from './CatalogStatus';
import { Button } from './ui';

/** App shell header: brand mark + wordmark (left), live provenance pill + export (right). */
export function AppHeader() {
  const { summary, retry } = useCatalogSummary();
  return (
    <header className="app-header sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="IGNIS home">
          {/* Interim brand mark: 64px derivative of /art/logo-flame.webp (master untouched). One <img>, never a CSS background. */}
          <img src="/art/logo-flame-64.webp" width={30} height={30} alt="" aria-hidden className="size-[30px] rounded-full" />
          <span className="text-[17px] font-bold tracking-[0.18em]">IGNIS</span>
          <span className="console-label hidden text-dim lg:inline">Mission console</span>
        </a>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          {/* Provenance strip (§8.1 item 0). Coder B expands it into the campaign/source panel. */}
          <ProvenancePill summary={summary} retry={retry} />
          {/* §8.1 item 6. Coder A builds the export endpoint; enable once it lands. */}
          <Button size="sm" variant="secondary" icon="download" disabled title="Open dataset export lands with Coder A">
            <span className="hidden md:inline">Export dataset</span>
            <span className="sr-only md:hidden">Export dataset</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
