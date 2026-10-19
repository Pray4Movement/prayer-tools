// App analytics (`app_open`, `language_switched`, …) with the device id as
// the anonymous hash; recorded per site when a site slug is given.
import { withOrg } from '@prayertools/shared/db/scope'
import { forwardEvent, geoFromHeaders } from '@prayertools/shared/statinator'
import { useDb } from '../../utils/db'
import { background, limit, readJson, str } from '../../utils/request'
import { apiSite, requireDevice } from '../../utils/app-api'
import { APP_EVENTS, recordCollect } from '../../utils/collect'
import { forwardInBackground, siteGeo } from '../../utils/analytics'

export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  limit(event, 'v1-collect', 120, 60_000)
  const body = await readJson(event, 8192)
  const type = str(body.event_type, 40)
  if (!APP_EVENTS.has(type)) throw createError({ statusCode: 400, statusMessage: 'Unsupported event_type' })
  let metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata as Record<string, unknown> : {}
  if (JSON.stringify(metadata).length > 4096) metadata = {}
  const language = str(body.language, 16) || null
  const slug = str(body.site, 40)
  if (slug) {
    const site = await apiSite(slug)
    const geo = await siteGeo(site.orgId)
    const campaignId = await withOrg(useDb(), site.orgId, tx => recordCollect(tx, site.orgId, geo.timezone, {
      type, anonymousId: device.deviceId, country: getRequestHeader(event, 'cf-ipcountry')?.slice(0, 2) ?? null, url: null, referrer: null, ownHost: null, metadata
    }))
    forwardInBackground(event, { orgId: site.orgId, slug: site.slug }, { event_type: type, anonymous_hash: device.deviceId, language, campaignId, metadata: { ...metadata, source: 'app' } })
  } else {
    background(event, forwardEvent({ event_type: type, anonymous_hash: device.deviceId, language, metadata: { ...metadata, source: 'app' }, geo: geoFromHeaders(n => getRequestHeader(event, n)) }))
  }
  setResponseStatus(event, 202)
  return { ok: true }
})
