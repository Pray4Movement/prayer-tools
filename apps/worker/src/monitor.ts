// Uptime Kuma push heartbeats and a dependency-free Sentry reporter (the
// envelope endpoint over fetch). Both no-op when their env var is unset.
import { randomUUID } from 'node:crypto'

export async function pushHeartbeat(url: string | undefined, status: 'up' | 'down', msg: string, pingMs?: number): Promise<void> {
  if (!url) return
  const u = new URL(url)
  u.searchParams.set('status', status)
  u.searchParams.set('msg', msg.slice(0, 200))
  if (pingMs !== undefined) u.searchParams.set('ping', String(Math.round(pingMs)))
  try {
    await fetch(u, { signal: AbortSignal.timeout(10_000) })
  } catch {
    // A missed heartbeat is what the monitor alerts on.
  }
}

export function dailyHeartbeatUrl(job: string): string | undefined {
  return process.env[`KUMA_PUSH_DAILY_${job.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`] || undefined
}

interface Dsn {
  endpoint: string
  auth: string
}

function parseDsn(dsn: string | undefined): Dsn | null {
  if (!dsn) return null
  try {
    const u = new URL(dsn)
    const project = u.pathname.replace(/^\//, '')
    return {
      endpoint: `${u.protocol}//${u.host}/api/${project}/envelope/`,
      auth: `Sentry sentry_version=7, sentry_key=${u.username}, sentry_client=prayertools-worker/1.0`
    }
  } catch {
    return null
  }
}

const EMAIL_RE = /[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}/gi

// Emails never leave the server: they are masked in messages and stacks.
export function scrub(text: string): string {
  return text.replace(EMAIL_RE, '[email]')
}

export async function captureException(err: unknown, tags: Record<string, string | undefined> = {}): Promise<void> {
  const dsn = parseDsn(process.env.SENTRY_DSN)
  if (!dsn) return
  const e = err instanceof Error ? err : new Error(String(err))
  const eventId = randomUUID().replace(/-/g, '')
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: 'node',
    level: 'error',
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    server_name: 'worker',
    tags: Object.fromEntries(Object.entries({ process: 'worker', ...tags }).filter(([, v]) => v)),
    exception: { values: [{ type: e.name, value: scrub(e.message), stacktrace: e.stack ? { frames: [{ filename: 'stack', function: scrub(e.stack).slice(0, 4000) }] } : undefined }] }
  }
  const body = `${JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: 'event' })}\n${JSON.stringify(event)}\n`
  try {
    await fetch(dsn.endpoint, { method: 'POST', headers: { 'content-type': 'application/x-sentry-envelope', 'x-sentry-auth': dsn.auth }, body, signal: AbortSignal.timeout(10_000) })
  } catch {
    // Reporting must never break the worker.
  }
}
