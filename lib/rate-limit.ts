// Best-effort in-memory rate limiter (fixed window per key).
//
// LIMITATION: state lives in the Node process, so on serverless/multi-instance
// hosts (e.g. Vercel) each instance keeps its own counters and a cold start
// resets them. It is a first-line abuse barrier, not a strict global guarantee.
// For strict cross-instance limits, back this with a shared store (Vercel KV /
// Upstash Redis) behind the same `rateLimit()` signature.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Drop expired buckets opportunistically so the map cannot grow without bound
// under many distinct keys (e.g. one per client IP).
function prune(now: number): void {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

export type RateLimitResult = { ok: boolean; retryAfterMs: number };

/**
 * Allows up to `limit` hits per `windowMs` for `key`. Returns ok=false once the
 * window is exhausted, with the time until the window resets.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true, retryAfterMs: bucket.resetAt - now };
}
