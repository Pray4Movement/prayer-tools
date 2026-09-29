// Cloudflare for SaaS custom hostnames. Champions CNAME their domain to the
// fallback origin; hostnames and certificates are created through the API.
// Without an API token (local development) hostnames are checked by DNS
// only: a CNAME to the fallback origin counts as active.
import { resolveCname } from 'node:dns/promises'
import { platformConfig } from './config'

export interface HostnameStatus {
  id: string | null
  status: 'pending' | 'active' | 'failing'
  // DNS records the champion must add, for the admin screen.
  records: { type: string, name: string, value: string }[]
  detail?: string
}

export function cloudflareConfigured(): boolean {
  const c = platformConfig().cloudflare
  return !!(c.apiToken && c.zoneId)
}

async function cf<T>(path: string, init: RequestInit = {}): Promise<T> {
  const c = platformConfig().cloudflare
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${c.zoneId}${path}`, {
    ...init,
    headers: { 'authorization': `Bearer ${c.apiToken}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000)
  })
  const json = await res.json() as { success: boolean, errors?: { message: string }[], result: T }
  if (!json.success) throw new Error(json.errors?.map(e => e.message).join('; ') || `Cloudflare ${res.status}`)
  return json.result
}

interface CfHostname {
  id: string
  hostname: string
  status: string
  ssl?: { status?: string, validation_records?: { txt_name?: string, txt_value?: string }[] }
  ownership_verification?: { type: string, name: string, value: string }
}

function toStatus(h: CfHostname): HostnameStatus {
  const fallback = platformConfig().cloudflare.fallbackOrigin
  const records = [{ type: 'CNAME', name: h.hostname, value: fallback }]
  if (h.ownership_verification) records.push({ type: h.ownership_verification.type.toUpperCase(), name: h.ownership_verification.name, value: h.ownership_verification.value })
  for (const v of h.ssl?.validation_records ?? []) {
    if (v.txt_name && v.txt_value) records.push({ type: 'TXT', name: v.txt_name, value: v.txt_value })
  }
  const active = h.status === 'active' && (!h.ssl?.status || h.ssl.status === 'active')
  const failing = ['moved', 'deleted', 'blocked'].includes(h.status)
  return { id: h.id, status: active ? 'active' : failing ? 'failing' : 'pending', records, detail: `${h.status}/${h.ssl?.status ?? '-'}` }
}

async function dnsStatus(hostname: string): Promise<HostnameStatus> {
  const fallback = platformConfig().cloudflare.fallbackOrigin
  const records = [{ type: 'CNAME', name: hostname, value: fallback }]
  try {
    const cnames = await resolveCname(hostname)
    const ok = cnames.some(c => c.replace(/\.$/, '').toLowerCase() === fallback.toLowerCase())
    return { id: null, status: ok ? 'active' : 'pending', records, detail: ok ? 'dns' : `cname=${cnames.join(',')}` }
  } catch {
    return { id: null, status: 'pending', records, detail: 'no-cname' }
  }
}

export async function createHostname(hostname: string): Promise<HostnameStatus> {
  if (!cloudflareConfigured()) return await dnsStatus(hostname)
  const h = await cf<CfHostname>('/custom_hostnames', {
    method: 'POST',
    body: JSON.stringify({ hostname, ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } } })
  })
  return toStatus(h)
}

export async function hostnameStatus(hostname: string, id: string | null): Promise<HostnameStatus> {
  if (!cloudflareConfigured() || !id) return await dnsStatus(hostname)
  try {
    return toStatus(await cf<CfHostname>(`/custom_hostnames/${id}`))
  } catch (err) {
    return { id, status: 'failing', records: [], detail: (err as Error).message }
  }
}

// A removed domain is deleted from Cloudflare immediately (takeover protection).
export async function deleteHostname(id: string | null): Promise<void> {
  if (!cloudflareConfigured() || !id) return
  await cf(`/custom_hostnames/${id}`, { method: 'DELETE' })
}

export const HOSTNAME_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/
