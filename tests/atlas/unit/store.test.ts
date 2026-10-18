import { describe, expect, it } from 'vitest';
import { createStore } from '../../../src/atlas-client/store.js';

/* Spec 005 FR-003: one typed store; the page renders from it and only it. */
describe('createStore', () => {
  it('holds the state and tells each subscriber when it changes, with the new state', () => {
    const store = createStore({ n: 1 });
    const seen: number[] = [];
    store.subscribe((s) => seen.push(s.n));
    store.set({ n: 2 });
    store.set({ n: 3 });
    expect(store.get()).toEqual({ n: 3 });
    expect(seen).toEqual([2, 3]);
  });

  it('does not tell anyone when the state is the very same object', () => {
    const state = { n: 1 };
    const store = createStore(state);
    const seen: number[] = [];
    store.subscribe((s) => seen.push(s.n));
    store.set(state);
    expect(seen).toEqual([]);
  });

  it('stops telling a subscriber that unsubscribed', () => {
    const store = createStore(0);
    const seen: number[] = [];
    const stop = store.subscribe((s) => seen.push(s));
    store.set(1);
    stop();
    store.set(2);
    expect(seen).toEqual([1]);
  });
});
