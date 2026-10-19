// Server-side analytics: per-site stats are written by the callers; this
// forwards events to Statinator in the background with the visitor's geo,
// the site's coordinates and site metadata.
import type { H3Event } from 'h3'
import { withOrg } from '@prayertools/shared/db/scope'
import { forwardEvent, geoFromHeaders, type StatinatorEvent } from '@prayertools/shared/statinator'
import { useDb } from './db'
import { background } from './request'

interface SiteGeo {
  lat: number | null
  lng: number | null
  timezone: string
}

const geoCache = new Map<string, { value: SiteGeo, expires: number }>()

export async function siteGeo(orgId: string): Promise<SiteGeo> {
  const hit = geoCache.get(orgId)
  if (hit && hit.expires > Date.now()) return hit.value
  const row = await withOrg(useDb(), orgId, tx => tx.selectFrom('pt_site').select(['latitude', 'longitude', 'timezone']).executeTakeFirst())
  const value = { lat: row?.latitude ?? null, lng: row?.longitude ?? null, timezone: row?.timezone ?? 'UTC' }
  geoCache.set(orgId, { value, expires: Date.now() + 60_000 })
  return value
}

export interface SiteRef {
  orgId: string
  slug: string
  host?: string
}

export interface ForwardInput extends Omit<StatinatorEvent, 'geo' | 'hostname' | 'target_latitude' | 'target_longitude'> {
  campaignId?: string | null
}

async function build(event: H3Event, site: SiteRef, e: ForwardInput): Promise<StatinatorEvent> {
  const geo = await siteGeo(site.orgId).catch(() => null)
  const { campaignId, metadata, ...rest } = e
  return {
    ...rest,
    hostname: site.host ?? null,
    geo: geoFromHeaders(name => getRequestHeader(event, name)),
    userAgent: getRequestHeader(event, 'user-agent') ?? null,
    target_latitude: geo?.lat ?? null,
    target_longitude: geo?.lng ?? null,
    metadata: { site_id: site.orgId, site_slug: site.slug, campaign_id: campaignId ?? undefined, timezone: geo?.timezone, ...(metadata ?? {}) }
  }
}

export function forwardInBackground(event: H3Event, site: SiteRef, e: ForwardInput): void {
  background(event, build(event, site, e).then(forwardEvent))
}

export async function forwardNow(event: H3Event, site: SiteRef, e: ForwardInput): Promise<string | null> {
  return await forwardEvent(await build(event, site, e))
}
