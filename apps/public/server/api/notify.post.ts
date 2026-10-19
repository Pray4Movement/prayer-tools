// "Notify me when this campaign runs again": the site-updates consent on a
// CRM contact, without a subscription.
import { withOrg } from '@prayertools/shared/db/scope'
import { normalizeEmail, PURPOSE_SITE_UPDATES, setConsent, upsertContact } from '@prayertools/shared/crm'
import { useDb, ensureSystemUserOnce } from '../utils/db'
import { bad, clientIp, limit, readJson, requireTurnstile, str } from '../utils/request'
import { siteContext } from '../utils/site-context'

export default defineEventHandler(async (event) => {
  const ctx = siteContext(event)
  limit(event, 'notify', 5, 60_000)
  const body = await readJson(event)
  await requireTurnstile(event, body.turnstile)
  const { normalized, valid } = normalizeEmail(str(body.email, 254))
  if (!valid) bad('email')
  await ensureSystemUserOnce()
  await withOrg(useDb(), ctx.orgId, async (tx) => {
    const site = await tx.selectFrom('pt_site').select(['languages', 'default_language']).executeTakeFirstOrThrow()
    const lang = site.languages.includes(str(body.language, 10)) ? str(body.language, 10) : site.default_language
    const contact = await upsertContact(tx, { email: normalized, name: str(body.name, 200) || null, data: { pt_language: lang }, source: 'notify form' })
    await setConsent(tx, contact.channelId, PURPOSE_SITE_UPDATES, true, {
      wording: { key: 'between.notify_title' },
      surface: 'notify_form',
      source: ctx.host,
      language: lang,
      ip: clientIp(event),
      userAgent: getRequestHeader(event, 'user-agent') ?? null
    })
  })
  return { ok: true }
})
