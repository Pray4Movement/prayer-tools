import type { H3Event } from 'h3'
import { rateLimit } from '@prayertools/shared/rate-limit'
import { verifyTurnstile } from '@prayertools/shared/turnstile'

export const SHARED_CACHE = 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400'
export const SHORT_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600'
export const PRIVATE_CACHE = 'private, no-store'
export const NOT_FOUND_CACHE = 'public, max-age=0, s-maxage=60'

// The host the visitor asked for, including a non-default port (dev).
export function requestHost(event: H3Event): string {
  const raw = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || ''
  return raw.split(',')[0]!.trim().toLowerCase()
}

export function requestScheme(event: H3Event): 'http' | 'https' {
  const proto = getRequestHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim()
  if (proto === 'https' || proto === 'http') return proto
  return requestHost(event).startsWith('localhost') || requestHost(event).includes('.localhost') ? 'http' : 'https'
}

export function clientIp(event: H3Event): string {
  return getRequestHeader(event, 'cf-connecting-ip')
    || getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || event.node.req.socket?.remoteAddress
    || 'unknown'
}

export function setCache(event: H3Event, value: string): void {
  setResponseHeader(event, 'cache-control', value)
}

// Throws 429 when the caller exceeded `limit` requests in the window.
export function limit(event: H3Event, bucket: string, max: number, windowMs: number): void {
  const r = rateLimit(`${bucket}:${clientIp(event)}`, max, windowMs)
  if (!r.ok) {
    setResponseHeader(event, 'retry-after', r.retryAfter)
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
}

export async function requireTurnstile(event: H3Event, token: unknown): Promise<void> {
  if (!(await verifyTurnstile(typeof token === 'string' ? token : null, clientIp(event)))) {
    throw createError({ statusCode: 400, statusMessage: 'turnstile' })
  }
}

const MAX_BODY = 32 * 1024

// JSON body with a size cap. sendBeacon may post JSON as text/plain.
export async function readJson<T = Record<string, unknown>>(event: H3Event, maxBytes = MAX_BODY): Promise<T> {
  const raw = await readRawBody(event, 'utf8')
  if (!raw) return {} as T
  if (raw.length > maxBytes) throw createError({ statusCode: 413, statusMessage: 'Body too large' })
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object')
    return parsed as T
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' })
  }
}

export function str(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function bad(message: string, data?: Record<string, unknown>): never {
  throw createError({ statusCode: 400, statusMessage: message, data })
}

// Runs analytics or mail work after the response when the runtime supports it.
export function background(event: H3Event, promise: Promise<unknown>): void {
  const p = promise.catch(err => console.error('[background]', err))
  const waitUntil = (event as unknown as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil
  if (typeof waitUntil === 'function') waitUntil.call(event, p)
}
