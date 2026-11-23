import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryCache = new Map<string, string>();

export async function getItem(key: string): Promise<string | null> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) ?? null;
  }
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      memoryCache.set(key, value);
    }
    return value;
  } catch {
    return memoryCache.get(key) ?? null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  memoryCache.set(key, value);
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // keep memory cache even if disk fails
  }
}

export async function removeItem(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function multiGet(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  const missing: string[] = [];

  for (const key of keys) {
    if (memoryCache.has(key)) {
      result[key] = memoryCache.get(key) ?? null;
    } else {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    try {
      const pairs = await Promise.all(
        missing.map(async key => [key, await AsyncStorage.getItem(key)] as const),
      );
      for (const [key, value] of pairs) {
        if (value !== null) {
          memoryCache.set(key, value);
        }
        result[key] = value;
      }
    } catch {
      for (const key of missing) {
        result[key] = memoryCache.get(key) ?? null;
      }
    }
  }

  return result;
}

export async function multiSet(entries: [string, string][]): Promise<void> {
  for (const [key, value] of entries) {
    memoryCache.set(key, value);
  }
  try {
    await Promise.all(entries.map(([key, value]) => AsyncStorage.setItem(key, value)));
  } catch {
    // memory cache already updated
  }
}

export async function clearAll(): Promise<void> {
  memoryCache.clear();
  try {
    await AsyncStorage.clear();
  } catch {
    // ignore
  }
}

export async function hydrateStorage(keys: string[]): Promise<Record<string, string | null>> {
  return multiGet(keys);
}

export function getCachedItem(key: string): string | null {
  return memoryCache.get(key) ?? null;
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await setItem(key, JSON.stringify(value));
}
