const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 12;
const MAX_TRACKED_CLIENTS = 2_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const clients = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Best-effort client identity; Vercel overwrites forwarded headers at its edge. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const value = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
  return value.slice(0, 64);
}

function pruneClients(now: number): void {
  for (const [key, entry] of clients) {
    if (entry.resetAt <= now) clients.delete(key);
  }

  while (clients.size >= MAX_TRACKED_CLIENTS) {
    const oldestKey = clients.keys().next().value;
    if (!oldestKey) break;
    clients.delete(oldestKey);
  }
}

/** Fixed-window in-memory limiter; adequate for a small single-instance demo. */
export function consumeRateLimit(key: string, now = Date.now()): RateLimitResult {
  if (clients.size >= MAX_TRACKED_CLIENTS) pruneClients(now);

  const existing = clients.get(key);
  if (!existing || existing.resetAt <= now) {
    clients.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1_000),
    };
  }

  existing.count += 1;
  const allowed = existing.count <= RATE_LIMIT_MAX_REQUESTS;
  return {
    allowed,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1_000)),
  };
}

/** Reset limiter state between isolated tests. */
export function resetRateLimits(): void {
  clients.clear();
}
