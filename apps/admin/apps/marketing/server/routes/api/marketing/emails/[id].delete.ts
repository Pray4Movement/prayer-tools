export default defineMarketingHandler('marketing.send', async (event, tx) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const res = await tx.deleteFrom('marketing_email').where('id', '=', id).where('status', '=', 'draft').executeTakeFirst()
  if (!Number(res.numDeletedRows)) throw createError({ statusCode: 409, statusMessage: 'Only drafts can be deleted.' })
  return { ok: true }
})
