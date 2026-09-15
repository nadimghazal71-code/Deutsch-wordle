import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Store } from '@store/stats';
import { STORAGE_KEY, freshStore, hydrate } from '@store/stats';

/**
 * The mobile adapter. Same stored shape, same hydrate/migrate logic and same stats
 * rules as the web app — only the I/O differs, and it is async here.
 */
export async function load(): Promise<Store> {
  try {
    return hydrate(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return freshStore();
  }
}

export async function save(store: Store): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable. The round in memory still plays fine.
  }
}
