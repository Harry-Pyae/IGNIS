/**
 * When the lazily loaded console is downloaded and when it mounts (Home.tsx).
 * - prefetch: once the browser is idle after first paint (download only, nothing renders);
 * - mount: when the console's slot comes within MOUNT_MARGIN of the viewport, or immediately when the URL hash /
 *   a scrollToId() call targets a console anchor (deep links keep working).
 * Plain DOM, no React, so tests can drive it with fakes.
 */
const CONSOLE_ANCHOR = /^(console|s[1-5]|experiment-.+)$/;
const MOUNT_MARGIN = '800px 0px';
const IDLE_FALLBACK_MS = 2000; // Safari has no requestIdleCallback
export const CONSOLE_REQUEST = 'ignis:console';

export const isConsoleAnchor = (id: string) => CONSOLE_ANCHOR.test(id);

let pendingAnchor: string | null = null;

/** Ask for the console to mount, then scroll to `id` once it has (see takePendingAnchor). */
export function requestConsole(id: string, target: EventTarget = window) {
  pendingAnchor = id;
  target.dispatchEvent(new Event(CONSOLE_REQUEST));
}

/** The console anchor to scroll to after mounting, if any (read once). */
export function takePendingAnchor(): string | null {
  const id = pendingAnchor;
  pendingAnchor = null;
  return id;
}

export type ConsoleEnv = Pick<Window, 'addEventListener' | 'removeEventListener' | 'setTimeout' | 'location'> & {
  IntersectionObserver?: typeof IntersectionObserver;
  requestIdleCallback?: (cb: () => void) => number;
};

/** Wire the triggers for one console slot. Returns a cleanup. `mount` is called at most once. */
export function watchConsole(slot: Element, on: { prefetch(): void; mount(): void }, env: ConsoleEnv = window): () => void {
  const hashAnchor = () => decodeURIComponent(env.location.hash.slice(1));
  let done = false;
  let observer: IntersectionObserver | null = null;
  const onHash = () => {
    if (!isConsoleAnchor(hashAnchor())) return;
    pendingAnchor = hashAnchor();
    mount();
  };
  const cleanup = () => {
    observer?.disconnect();
    env.removeEventListener('hashchange', onHash);
    env.removeEventListener(CONSOLE_REQUEST, mount);
  };
  function mount() {
    if (done) return;
    done = true;
    cleanup();
    on.mount();
  }

  if (isConsoleAnchor(hashAnchor())) {
    pendingAnchor = hashAnchor();
    mount();
    return cleanup;
  }
  env.addEventListener('hashchange', onHash);
  env.addEventListener(CONSOLE_REQUEST, mount);
  if (env.IntersectionObserver) {
    observer = new env.IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && mount(), { rootMargin: MOUNT_MARGIN });
    observer.observe(slot);
  } else {
    mount(); // no IntersectionObserver: render it right away
  }
  if (env.requestIdleCallback) env.requestIdleCallback(() => on.prefetch());
  else env.setTimeout(() => on.prefetch(), IDLE_FALLBACK_MS);
  return () => {
    done = true;
    cleanup();
  };
}
