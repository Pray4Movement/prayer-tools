import { sendProblems } from '../../../../../../lib/render'

// Send now (no time) or at a time; the worker picks it up when due.
export default defineMarketingHandler('marketing.send', async (event, tx) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const b = await marketingBody<{ scheduled_at?: string | null }>(event)
  const email = await tx.selectFrom('marketing_email').selectAll().where('id', '=', id).executeTakeFirst()
  if (!email) marketingNotFound('Email not found.')
  if (email.status !== 'draft') throw createError({ statusCode: 409, statusMessage: 'This email has already been scheduled or sent.' })
  const problems = sendProblems(email.versions, email.source_language, email.audiences)
  if (problems.length) marketingBadRequest(problems.join(' '))
  const scheduledAt = marketingScheduleTime(b.scheduled_at)
  await tx.updateTable('marketing_email').set({ status: 'scheduled', scheduled_at: scheduledAt, updated_at: new Date() }).where('id', '=', id).where('status', '=', 'draft').execute()
  return { status: 'scheduled', scheduled_at: scheduledAt }
})
