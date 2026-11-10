import { describe, expect, it } from 'vitest';
import { CONSOLE_REQUEST, requestConsole, requestGuidedMission, takePendingAnchor, takePendingMission, watchConsole, type ConsoleEnv } from '../src/pages/consoleLoader';

/** A fake browser: one IntersectionObserver, a captured idle callback, a real EventTarget for hash/request events. */
function fakeEnv(hash = '') {
  const events = new EventTarget();
  const state = { idle: null as null | (() => void), intersect: null as null | ((hit: boolean) => void), observed: 0 };
  class FakeObserver {
    constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
      state.intersect = (hit) => cb([{ isIntersecting: hit }]);
    }
    observe() { state.observed++; }
    disconnect() { state.intersect = null; }
  }
  const env = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    setTimeout: () => 0,
    location: { hash },
    IntersectionObserver: FakeObserver,
    requestIdleCallback: (cb: () => void) => ((state.idle = cb), 1),
  } as unknown as ConsoleEnv;
  return { env, events, state };
}

const slot = {} as Element;

describe('console code-split loader', () => {
  it('prefetches the chunk when idle and mounts it once when the slot nears the viewport', () => {
    const { env, state } = fakeEnv();
    const calls = { prefetch: 0, mount: 0 };
    watchConsole(slot, { prefetch: () => calls.prefetch++, mount: () => calls.mount++ }, env);
    expect(state.observed).toBe(1);
    expect(calls).toEqual({ prefetch: 0, mount: 0 }); // nothing on first paint

    state.idle!(); // browser idle → download only
    expect(calls).toEqual({ prefetch: 1, mount: 0 });

    state.intersect!(false);
    expect(calls.mount).toBe(0);
    state.intersect!(true); // scrolled within the margin → mount
    expect(calls.mount).toBe(1);
    expect(state.intersect).toBeNull(); // observer disconnected: it can't mount twice
  });

  it('deep links: a console hash or scrollToId request mounts immediately and leaves the anchor to scroll to', () => {
    const mounted: string[] = [];
    watchConsole(slot, { prefetch: () => {}, mount: () => mounted.push('hash') }, fakeEnv('#s3').env);
    expect(mounted).toEqual(['hash']);
    expect(takePendingAnchor()).toBe('s3');
    expect(takePendingAnchor()).toBeNull(); // read once

    const other = fakeEnv('#how-it-works'); // a landing anchor doesn't mount the console
    watchConsole(slot, { prefetch: () => {}, mount: () => mounted.push('request') }, other.env);
    expect(mounted).toEqual(['hash']);
    requestConsole('experiment-abc', other.events);
    expect(mounted).toEqual(['hash', 'request']);
    expect(takePendingAnchor()).toBe('experiment-abc');
    other.events.dispatchEvent(new Event(CONSOLE_REQUEST));
    expect(mounted).toEqual(['hash', 'request']); // at most once
  });

  it('keeps a guided mission preset pending while the lazy console mounts', () => {
    const { env, events } = fakeEnv('#how-it-works');
    const mounted: string[] = [];
    watchConsole(slot, { prefetch: () => {}, mount: () => mounted.push('console') }, env);

    requestGuidedMission('cabin-wall-panel', events);

    expect(mounted).toEqual(['console']);
    expect(takePendingAnchor()).toBe('console');
    expect(takePendingMission()).toBe('cabin-wall-panel');
    expect(takePendingMission()).toBeNull();
  });
});
