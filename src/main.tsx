import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { AppHeader } from './components/AppHeader';
import { EmptyState } from './components/ui';
import { Home } from './pages/Home';
import './styles/index.css';

// Internal pages load on demand so the landing bundle stays small (LCP).
const Curate = lazy(() => import('./pages/Curate').then((m) => ({ default: m.Curate })));
const Kit = lazy(() => import('./pages/Kit').then((m) => ({ default: m.Kit })));

// ponytail: pathname switch, no router — add react-router if Coder B needs nested routes.
const ROUTES: Record<string, () => React.JSX.Element> = {
  '/curate': () => <Curate />,
  '/kit': () => <Kit />,
};
const Page = ROUTES[window.location.pathname.replace(/\/$/, '')] ?? (() => <Home />);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* App ambient background (bg-glow art) — replaces CSS aurora/starfield layers. */}
    <div className="ambient" aria-hidden />
    <AppHeader />
    <Suspense fallback={<EmptyState illustration title="Loading…" className="py-24" />}>
      <Page />
    </Suspense>
  </StrictMode>,
);
