import { withMySubscription } from '../../../../utils/my'
import { setSubscriptionConsent } from '../../../../utils/sub-actions'
import { clientIp, limit, readJson, requestHost } from '../../../../utils/request'

export default defineEventHandler(async (event) => {
  limit(event, 'my', 60, 60_000)
  const body = await readJson(event)
  await withMySubscription(event, (tx, sub) => setSubscriptionConsent(tx, sub, body.purpose, body.grant, {
    surface: 'my_prayer', source: requestHost(event), ip: clientIp(event), userAgent: getRequestHeader(event, 'user-agent') ?? null
  }))
  return { ok: true }
})
