// Signed unsubscribe tokens: base64url JSON payload + HMAC-SHA256. A token
// names a delivery by id, never an address, and expires.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const UNSUBSCRIBE_TOKEN_DAYS = 365

export interface UnsubscribePayload {
  // Org whose email was sent.
  o: string
  // The delivery (absent on test sends and previews, `t`).
  d?: string
  t?: true
  // Expiry, unix seconds.
  x: number
}

export function signToken(data: Omit<UnsubscribePayload, 'x'>, secret: string, now: Date = new Date()): string {
  const full: UnsubscribePayload = { ...data, x: Math.floor(now.getTime() / 1000) + UNSUBSCRIBE_TOKEN_DAYS * 86_400 }
  const payload = Buffer.from(JSON.stringify(full)).toString('base64url')
  const sig = createHmac('sha256', secret).update(`marketing:${payload}`).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyToken(token: string | null | undefined, secret: string, now: Date = new Date()): UnsubscribePayload | null {
  if (!token || typeof token !== 'string') return null
  const i = token.lastIndexOf('.')
  if (i <= 0) return null
  const payload = token.slice(0, i)
  const expected = createHmac('sha256', secret).update(`marketing:${payload}`).digest()
  const actual = Buffer.from(token.slice(i + 1), 'base64url')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as UnsubscribePayload
    if (typeof data.o !== 'string' || typeof data.x !== 'number') return null
    if (!data.t && typeof data.d !== 'string') return null
    if (data.x * 1000 < now.getTime()) return null
    return data
  } catch {
    return null
  }
}

// One-email-per-person key for multi-site sends: SHA-256 of the lowercased address.
export function addressFingerprint(address: string): string {
  return createHash('sha256').update(address.trim().toLowerCase()).digest('hex')
}

export function unsubscribeUrls(base: string, token: string): { page: string, oneClick: string } {
  const origin = base.replace(/\/+$/, '')
  return {
    page: `${origin}/marketing/unsubscribe/${encodeURIComponent(token)}`,
    oneClick: `${origin}/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`
  }
}
