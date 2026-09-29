// Resolves the site for a request host (cached briefly; unknown hosts are
// cached as misses too, so probing random hosts stays cheap).
import type { H3Event } from 'h3'
import { resolveSiteByHost, subdomainUrl, type ResolvedSite } from '@prayertools/shared/site'
import { useDb } from './db'
import { requestScheme } from './request'

export interface SiteContext extends ResolvedSite {
  host: string
  hostKind: 'site' | 'custom'
  origin: string
  canonicalOrigin: string
  preview: boolean
}

const TTL_MS = 15_000
const cache = new Map<string, { value: ResolvedSite | null, expires: number }>()

export async function resolveSiteCached(host: string): Promise<ResolvedSite | null> {
  const hit = cache.get(host)
  if (hit && hit.expires > Date.now()) return hit.value
  const value = await resolveSiteByHost(useDb(), host)
  if (cache.size > 5000) cache.clear()
  cache.set(host, { value, expires: Date.now() + TTL_MS })
  return value
}

export function buildSiteContext(event: H3Event, host: string, kind: 'site' | 'custom', site: ResolvedSite): SiteContext {
  return {
    ...site,
    host,
    hostKind: kind,
    origin: `${requestScheme(event)}://${host}`,
    canonicalOrigin: site.activeDomain ? `https://${site.activeDomain}` : subdomainUrl(site.slug),
    preview: false
  }
}

export function siteContext(event: H3Event): SiteContext {
  const site = event.context.site as SiteContext | undefined
  if (!site) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return site
}
