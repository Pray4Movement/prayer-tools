// Webcal feed `/ics/<personal token>.ics`; WordPress-era ICS keys redirect here.
import { withOrg } from '@prayertools/shared/db/scope'
import { parseLink, personalToken } from '@prayertools/shared/links'
import { useDb } from '../../utils/db'
import { siteContext } from '../../utils/site-context'
import { subscriptionFeed } from '../../utils/ics'
import { legacySubscription } from '../../utils/actions'
import { PRIVATE_CACHE, setCache } from '../../utils/request'

export default defineEventHandler(async (event) => {
  const ctx = siteContext(event)
  const token = (getRouterParam(event, 'file') ?? '').replace(/\.ics$/, '')
  const link = parseLink(token, 'p')
  setCache(event, PRIVATE_CACHE)
  if (!link || link.orgId !== ctx.orgId) {
    const legacy = await legacySubscription(ctx.orgId, 'ics', token)
    if (legacy) return sendRedirect(event, `/ics/${personalToken(ctx.orgId, legacy.id)}.ics`, 301)
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const body = await withOrg(useDb(), ctx.orgId, async (tx) => {
    const sub = await tx.selectFrom('pt_subscription').selectAll().where('id', '=', link.subscriptionId).executeTakeFirst()
    return sub ? await subscriptionFeed(tx, ctx, sub) : null
  })
  if (!body) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  setResponseHeader(event, 'content-type', 'text/calendar; charset=utf-8')
  setResponseHeader(event, 'content-disposition', 'inline; filename="prayer-times.ics"')
  return body
})
