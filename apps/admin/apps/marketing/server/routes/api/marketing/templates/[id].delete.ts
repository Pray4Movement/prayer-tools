import { db } from '#core/server/utils/database'

export default defineMarketingUserHandler(async (event, userId) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const res = await db.deleteFrom('marketing_template').where('id', '=', id).where('owner_user_id', '=', userId).executeTakeFirst()
  if (!Number(res.numDeletedRows)) marketingNotFound('Template not found.')
  return { ok: true }
})
