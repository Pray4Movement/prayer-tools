import { withManaged } from '../../utils/manage'
import { setSubscriptionConsent } from '../../utils/sub-actions'
import { clientIp, limit, readJson } from '../../utils/request'

export default defineEventHandler(async (event) => {
  limit(event, 'manage', 60, 60_000)
  const body = await readJson(event)
  await withManaged(event, (tx, sub, ctx) => setSubscriptionConsent(tx, sub, body.purpose, body.grant, {
    surface: 'manage_page', source: ctx.host, ip: clientIp(event), userAgent: getRequestHeader(event, 'user-agent') ?? null
  }))
  return { ok: true }
})
