import { actOnParent, type ParentAction } from '../../../../../../lib/multi'

export default defineMarketingUserHandler(async (event, userId) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const { action } = await marketingBody<{ action?: string }>(event)
  if (!['cancel', 'pause', 'resume'].includes(action ?? '')) marketingBadRequest('Unknown action.')
  if (!(await actOnParent(marketingDb(), id, userId, action as ParentAction))) {
    throw createError({ statusCode: 409, statusMessage: 'That can\'t be done in the send\'s current state.' })
  }
  return { ok: true }
})
