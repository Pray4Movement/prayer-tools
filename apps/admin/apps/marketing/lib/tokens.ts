// Signed unsubscribe tokens: base64url JSON payload + HMAC-SHA256.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export interface UnsubscribePayload {
  // Org whose email was sent, and that email (absent for test sends).
  o: string
  e?: string
  d?: string
  p?: string | null
  a: string
  t?: true
}

export function signToken(data: UnsubscribePayload, secret: string): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = createHmac('sha256', secret).update(`marketing:${payload}`).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyToken(token: string | null | undefined, secret: string): UnsubscribePayload | null {
  if (!token || typeof token !== 'string') return null
  const i = token.lastIndexOf('.')
  if (i <= 0) return null
  const payload = token.slice(0, i)
  const expected = createHmac('sha256', secret).update(`marketing:${payload}`).digest()
  const actual = Buffer.from(token.slice(i + 1), 'base64url')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as UnsubscribePayload
    return typeof data.o === 'string' && typeof data.a === 'string' ? data : null
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
