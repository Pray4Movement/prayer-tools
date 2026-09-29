// Cloudflare Turnstile verification for public forms. Without a secret
// configured (local development) every token passes.
import { platformConfig } from './config'

export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = platformConfig().turnstileSecret
  if (!secret) return true
  if (!token) return false
  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.set('remoteip', ip)
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
    const json = await res.json() as { success?: boolean }
    return !!json.success
  } catch {
    return false
  }
}
