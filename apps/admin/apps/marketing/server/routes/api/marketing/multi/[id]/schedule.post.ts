import { db } from '#core/server/utils/database'
import { scheduleParent } from '../../../../../../lib/multi'
import { sendProblems } from '../../../../../../lib/render'

// Becomes one scheduled email per chosen site.
export default defineMarketingUserHandler(async (event, userId) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const b = await marketingBody<{ scheduled_at?: string | null }>(event)
  const parent = await db.selectFrom('marketing_parent').selectAll().where('id', '=', id).where('owner_user_id', '=', userId).executeTakeFirst()
  if (!parent) marketingNotFound('Send not found.')
  if (parent.status !== 'draft') throw createError({ statusCode: 409, statusMessage: 'This send has already been scheduled or sent.' })
  await marketingRequireSites(userId, parent.org_ids)
  const problems = sendProblems(parent.versions, parent.source_language, parent.audiences)
  if (problems.length) marketingBadRequest(problems.join(' '))
  const scheduledAt = marketingScheduleTime(b.scheduled_at)
  if (!(await scheduleParent(marketingDb(), parent.id, userId, scheduledAt))) throw createError({ statusCode: 409, statusMessage: 'This send has already been scheduled or sent.' })
  return { status: 'scheduled', scheduled_at: scheduledAt }
})
