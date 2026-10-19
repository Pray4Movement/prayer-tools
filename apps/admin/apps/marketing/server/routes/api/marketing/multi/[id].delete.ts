export default defineMarketingUserHandler(async (event, tx, userId) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const res = await tx.deleteFrom('marketing_parent').where('id', '=', id).where('owner_user_id', '=', userId).where('status', '=', 'draft').executeTakeFirst()
  if (!Number(res.numDeletedRows)) throw createError({ statusCode: 409, statusMessage: 'Only drafts can be deleted.' })
  return { ok: true }
})
