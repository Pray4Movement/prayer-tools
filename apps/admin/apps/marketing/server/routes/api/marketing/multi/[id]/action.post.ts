import { actOnParent, type ParentAction } from '../../../../../../lib/multi'

export default defineMarketingUserHandler(async (event, tx, userId) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const { action } = await marketingBody<{ action?: string }>(event)
  if (!['cancel', 'pause', 'resume'].includes(action ?? '')) marketingBadRequest('Unknown action.')
  // Resuming sends again, so the user must still be able to send on every site.
  if (action === 'resume') {
    const parent = await tx.selectFrom('marketing_parent').select('org_ids').where('id', '=', id).where('owner_user_id', '=', userId).executeTakeFirst()
    if (!parent) marketingNotFound('Send not found.')
    await marketingRequireSites(userId, parent.org_ids)
  }
  if (!(await actOnParent(tx, id, userId, action as ParentAction))) {
    throw createError({ statusCode: 409, statusMessage: 'That can\'t be done in the send\'s current state.' })
  }
  return { ok: true }
})
