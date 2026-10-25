const CACHE_TTL_MS = 5 * 60 * 1_000;
const CACHE_MAX_ENTRIES = 100;

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function readCachedResponse(key: string, now = Date.now()): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function writeCachedResponse(key: string, value: string, now = Date.now()): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
}

/** Clear transient AI cache between tests. */
export function clearAiCache(): void {
  cache.clear();
}
