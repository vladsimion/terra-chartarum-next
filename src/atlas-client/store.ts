/*
 * The one place the Atlas view lives (spec 005 FR-003): a value and the people who want to know
 * when it changes. The reducers in `src/atlas/view-state.ts` make the next value; nothing else does.
 */
export interface Store<T> {
  get(): T;
  set(next: T): void;
  /** Calls `listener` with each new state; returns the way to stop. */
  subscribe(listener: (state: T) => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<(state: T) => void>();
  return {
    get: () => state,
    set(next) {
      if (next === state) return;
      state = next;
      for (const listener of [...listeners]) listener(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
