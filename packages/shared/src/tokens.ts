// Tokens are long random strings shown once (in a link) and stored only as a
// SHA-256 hash. Signed values (cookies, one-click unsubscribe) are
// `payload.signature` with an HMAC over the payload.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Short share codes: unambiguous lowercase letters and digits.
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export function shortCode(length = 6): string {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length]
  return out
}

// Address fingerprint for the global suppression list and dedupe: SHA-256 of
// the lowercased, trimmed email.
export function emailHash(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

export function sign(payload: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifySigned(value: string | null | undefined, secret: string): string | null {
  if (!value) return null
  const i = value.lastIndexOf('.')
  if (i <= 0) return null
  const payload = value.slice(0, i)
  const expected = createHmac('sha256', secret).update(payload).digest()
  const actual = Buffer.from(value.slice(i + 1), 'base64url')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  return payload
}

export function signJson(data: unknown, secret: string): string {
  return sign(Buffer.from(JSON.stringify(data)).toString('base64url'), secret)
}

export function verifySignedJson<T>(value: string | null | undefined, secret: string): T | null {
  const payload = verifySigned(value, secret)
  if (!payload) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}
