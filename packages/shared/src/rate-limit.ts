// Fixed-window rate limiter kept in process memory. Each app instance limits
// on its own, which is enough to blunt form abuse; Cloudflare rate-limiting
// rules sit in front for anything larger.
const buckets = new Map<string, { count: number, resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean, retryAfter: number } {
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs }
    buckets.set(key, b)
  }
  b.count++
  if (buckets.size > 50_000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
  }
  return { ok: b.count <= limit, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
}
