// Forwarding to Statinator for cross-site analytics. Our server records the
// event for per-site stats first, then forwards it with the API key. No-ops
// when unconfigured; never throws.
import { platformConfig } from './config'
import { emailHash } from './tokens'

export interface Geo {
  ip?: string
  country?: string
  region?: string
  city?: string
  lat?: string
  lon?: string
}

export interface StatinatorEvent {
  event_type: string
  hostname?: string | null
  url?: string | null
  referrer?: string | null
  anonymous_hash?: string | null
  user_hash?: string | null
  email?: string | null
  value?: number | null
  language?: string | null
  screen_size?: string | null
  metadata?: Record<string, unknown> | null
  geo?: Geo | null
  userAgent?: string | null
  // The prayed-for place (the site's coordinates).
  target_latitude?: number | null
  target_longitude?: number | null
}

const PII_KEYS = new Set(['email', 'email_address', 'phone', 'name', 'first_name', 'last_name', 'full_name', 'message', 'story', 'comment', 'token'])

function sanitize(meta?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!meta) return null
  const out = Object.fromEntries(Object.entries(meta).filter(([k, v]) => !PII_KEYS.has(k) && v !== undefined))
  return Object.keys(out).length ? out : null
}

export function statinatorEnabled(): boolean {
  const c = platformConfig().statinator
  return !!(c.url && c.apiKey)
}

// Returns the Statinator event id (pageviews use it to seed heartbeats).
export async function forwardEvent(e: StatinatorEvent): Promise<string | null> {
  const c = platformConfig().statinator
  if (!c.url || !c.apiKey) return null
  try {
    const res = await fetch(`${c.url.replace(/\/$/, '')}/api/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': c.apiKey,
        ...(e.userAgent ? { 'user-agent': e.userAgent } : {})
      },
      body: JSON.stringify({
        project_id: c.projectId,
        event_type: e.event_type,
        hostname: e.hostname ?? null,
        url: e.url ?? null,
        referrer: e.referrer ?? null,
        anonymous_hash: e.anonymous_hash || undefined,
        user_hash: e.user_hash || (e.email ? emailHash(e.email) : undefined),
        value: e.value ?? null,
        language: e.language ?? null,
        screen_size: e.screen_size ?? null,
        metadata: sanitize(e.metadata),
        geo: e.geo ?? undefined,
        target_latitude: e.target_latitude ?? undefined,
        target_longitude: e.target_longitude ?? undefined
      }),
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) return null
    const json = await res.json().catch(() => ({})) as { id?: string | number }
    return json.id !== undefined ? String(json.id) : null
  } catch {
    return null
  }
}

export async function forwardHeartbeat(eventId: string, seconds: number): Promise<void> {
  const c = platformConfig().statinator
  if (!c.url || !c.apiKey) return
  try {
    await fetch(`${c.url.replace(/\/$/, '')}/api/heartbeat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': c.apiKey },
      body: JSON.stringify({ project_id: c.projectId, event_id: eventId, value: seconds }),
      signal: AbortSignal.timeout(5000)
    })
  } catch {
    // analytics is non-critical
  }
}

// Visitor geo from Cloudflare's request headers, sent as a body field (never
// forward cf-connecting-ip as a header).
export function geoFromHeaders(get: (name: string) => string | undefined | null): Geo | null {
  const geo: Geo = {}
  const ip = get('cf-connecting-ip') || get('x-forwarded-for')?.split(',')[0]?.trim()
  if (ip) geo.ip = ip
  const map: [string, keyof Geo][] = [['cf-ipcountry', 'country'], ['cf-ipregion', 'region'], ['cf-ipcity', 'city'], ['cf-iplatitude', 'lat'], ['cf-iplongitude', 'lon']]
  for (const [h, k] of map) {
    const v = get(h)
    if (v) geo[k] = v
  }
  return Object.keys(geo).length ? geo : null
}
