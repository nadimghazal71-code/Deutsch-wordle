import type { Store } from './stats.js';
import { STORAGE_KEY, freshStore, hydrate } from './stats.js';

/**
 * The web adapter: localStorage in, localStorage out. Every access is wrapped because
 * private-mode browsers throw on it and the game must stay playable — a failure
 * degrades to defaults rather than breaking the app.
 *
 * All the logic over the stored shape lives in ./stats.ts, shared with the mobile app.
 */
export function load(): Store {
  try {
    return hydrate(localStorage.getItem(STORAGE_KEY));
  } catch {
    return freshStore();
  }
}

export function save(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable or full. The round in memory still plays fine.
  }
}

export * from './stats.js';
