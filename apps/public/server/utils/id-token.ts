// Google / Apple sign-in: verifies the ID token and returns its verified email.
import { createRemoteJWKSet, jwtVerify } from 'jose'

const google = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
const apple = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))

export function signInProviders(): { google: string | null, apple: string | null } {
  return { google: process.env.GOOGLE_CLIENT_ID || null, apple: process.env.APPLE_SERVICES_ID || null }
}

export async function verifiedEmailFromIdToken(provider: unknown, token: unknown): Promise<string | null> {
  if (typeof token !== 'string' || token.length > 8192) return null
  const ids = signInProviders()
  try {
    if (provider === 'google' && ids.google) {
      const { payload } = await jwtVerify(token, google, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: ids.google })
      return payload.email_verified === true && typeof payload.email === 'string' ? payload.email : null
    }
    if (provider === 'apple' && ids.apple) {
      const { payload } = await jwtVerify(token, apple, { issuer: 'https://appleid.apple.com', audience: ids.apple })
      const verified = payload.email_verified === true || payload.email_verified === 'true'
      return verified && typeof payload.email === 'string' ? payload.email : null
    }
  } catch {
    return null
  }
  return null
}
