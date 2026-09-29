import { db } from '#core/server/utils/database'

export default defineMarketingUserHandler(async (event, userId) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const res = await db.deleteFrom('marketing_parent').where('id', '=', id).where('owner_user_id', '=', userId).where('status', '=', 'draft').executeTakeFirst()
  if (!Number(res.numDeletedRows)) throw createError({ statusCode: 409, statusMessage: 'Only drafts can be deleted.' })
  return { ok: true }
})
