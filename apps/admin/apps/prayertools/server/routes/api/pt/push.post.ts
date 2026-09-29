// Push announcement to the site's active app intercessors (the worker sends it).
import { enqueue } from '@prayertools/shared/jobs'
import { parseText, textIn } from '@prayertools/shared/translatable'

export default definePtHandler('pt.email.send', async (event, tx, ctx) => {
  const b = await ptBody(event)
  const site = await ptSite(tx)
  const heading = parseText(b.heading)
  const body = parseText(b.body)
  if (!heading || !body || !textIn(heading, site.default_language).trim() || !textIn(body, site.default_language).trim()) ptBadRequest('Write a title and a message.')
  const count = await tx.selectFrom('pt_subscription').select(eb => eb.fn.countAll<string>().as('n')).where('delivery', '=', 'app').where('status', '=', 'active').executeTakeFirst()
  await enqueue(ptTx(tx), 'push_announcement', { orgId: ctx.orgId, heading, body }, { orgId: ctx.orgId })
  return { recipients: Number(count?.n ?? 0) }
})
