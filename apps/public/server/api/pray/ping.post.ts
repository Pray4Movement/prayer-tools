import { withOrg } from '@prayertools/shared/db/scope'
import { parseLink } from '@prayertools/shared/links'
import { prayingNow } from '@prayertools/shared/stats'
import { useDb } from '../../utils/db'
import { limit, readJson } from '../../utils/request'
import { siteContext } from '../../utils/site-context'
import { recordPing } from '../../utils/prayer'
import { isUuid } from '../../lib/input'
import { forwardInBackground } from '../../utils/analytics'

export default defineEventHandler(async (event) => {
  const ctx = siteContext(event)
  limit(event, 'ping', 20, 60_000)
  const body = await readJson(event, 4096)
  if (!isUuid(body.id) || !isUuid(body.campaign)) throw createError({ statusCode: 400 })
  const day = Number.isInteger(body.day) && (body.day as number) > 0 ? body.day as number : null
  const source = body.source === 'manage' ? 'manage' : 'porch'
  const link = typeof body.p === 'string' ? parseLink(body.p, 'p') : null
  const result = await withOrg(useDb(), ctx.orgId, async (tx) => {
    const campaign = await tx.selectFrom('pt_campaign').select(['id', 'timezone']).where('id', '=', body.campaign as string).executeTakeFirst()
    if (!campaign) throw createError({ statusCode: 404 })
    let subscriptionId: string | null = null
    if (link && link.orgId === ctx.orgId) {
      const sub = await tx.selectFrom('pt_subscription').select(['id', 'intercessor_id']).where('id', '=', link.subscriptionId).where('anonymized_at', 'is', null).executeTakeFirst()
      subscriptionId = sub?.id ?? null
    }
    const ping = await recordPing(tx, {
      id: body.id as string,
      campaignId: campaign.id,
      timezone: campaign.timezone,
      day,
      language: typeof body.language === 'string' ? body.language.slice(0, 10) : null,
      source,
      subscriptionId,
      intercessorId: null,
      country: getRequestHeader(event, 'cf-ipcountry')?.slice(0, 2) ?? null
    })
    return { ping, now: await prayingNow(tx) }
  })
  if (result.ping.first) {
    forwardInBackground(event, { orgId: ctx.orgId, slug: ctx.slug, host: ctx.host }, {
      event_type: 'prayer_fuel_viewed',
      language: typeof body.language === 'string' ? body.language : null,
      campaignId: body.campaign as string,
      metadata: { source, content_day: day, subscription_id: result.ping.subscriptionId ?? undefined }
    })
  }
  return { ok: true, praying_now: result.now }
})
