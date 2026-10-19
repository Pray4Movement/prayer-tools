// Same-origin analytics relay: per-site stats first, then Statinator. Only
// pageviews wait for Statinator (its event id seeds the heartbeat loop).
import { withOrg } from '@prayertools/shared/db/scope'
import { useDb } from '../utils/db'
import { limit, readJson, requestHost, str } from '../utils/request'
import { siteContext } from '../utils/site-context'
import { recordCollect, WEB_EVENTS } from '../utils/collect'
import { forwardInBackground, forwardNow, siteGeo } from '../utils/analytics'
import { sameOrigin } from '../utils/same-origin'

const MAX_METADATA = 4096

export default defineEventHandler(async (event) => {
  const ctx = siteContext(event)
  sameOrigin(event)
  limit(event, 'collect', 120, 60_000)
  const body = await readJson(event, 8192)
  const type = str(body.event_type, 40)
  if (!WEB_EVENTS.has(type)) throw createError({ statusCode: 400, statusMessage: 'Unsupported event_type' })
  let metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata as Record<string, unknown> : {}
  if (JSON.stringify(metadata).length > MAX_METADATA) metadata = {}
  const input = {
    type,
    anonymousId: str(body.anonymous_hash, 64) || null,
    country: getRequestHeader(event, 'cf-ipcountry')?.slice(0, 2) ?? null,
    url: str(body.url, 2048) || null,
    referrer: str(body.referrer, 2048) || null,
    ownHost: requestHost(event),
    metadata
  }
  const geo = await siteGeo(ctx.orgId)
  const campaignId = await withOrg(useDb(), ctx.orgId, tx => recordCollect(tx, ctx.orgId, geo.timezone, input))
  const forward = {
    event_type: type,
    url: input.url,
    referrer: input.referrer,
    anonymous_hash: input.anonymousId,
    language: str(body.language, 16) || null,
    screen_size: str(body.screen_size, 32) || null,
    value: typeof body.value === 'number' && Number.isFinite(body.value) ? body.value : null,
    campaignId,
    metadata
  }
  const site = { orgId: ctx.orgId, slug: ctx.slug, host: ctx.host }
  if (type === 'pageview') return { id: await forwardNow(event, site, forward) }
  forwardInBackground(event, site, forward)
  setResponseStatus(event, 202)
  return { ok: true }
})
