// Runs `fn` over `items` with at most `limit` in flight; failures are returned, not thrown.
export async function mapPool<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<({ ok: true, value: R } | { ok: false, error: unknown })[]> {
  const results = new Array<{ ok: true, value: R } | { ok: false, error: unknown }>(items.length)
  let next = 0
  const lane = async () => {
    while (next < items.length) {
      const i = next++
      try {
        results[i] = { ok: true, value: await fn(items[i]!, i) }
      } catch (error) {
        results[i] = { ok: false, error }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane))
  return results
}

export function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const list = out.get(k)
    if (list) list.push(item)
    else out.set(k, [item])
  }
  return out
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
