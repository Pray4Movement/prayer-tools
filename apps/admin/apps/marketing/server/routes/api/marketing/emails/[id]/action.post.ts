import { cancelEmail, pauseEmail, resumeEmail } from '../../../../../../lib/deliver'

export default defineMarketingHandler('marketing.send', async (event, tx) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const { action } = await marketingBody<{ action?: string }>(event)
  const mtx = marketingTx(tx)
  let ok = false
  if (action === 'cancel') ok = await cancelEmail(mtx, id)
  else if (action === 'pause') ok = await pauseEmail(mtx, id)
  else if (action === 'resume') ok = await resumeEmail(mtx, id)
  else if (action === 'unschedule') {
    const res = await tx
      .updateTable('marketing_email')
      .set({ status: 'draft', scheduled_at: null, updated_at: new Date() })
      .where('id', '=', id)
      .where('status', '=', 'scheduled')
      .where('parent_id', 'is', null)
      .executeTakeFirst()
    ok = Number(res.numUpdatedRows) > 0
  } else marketingBadRequest('Unknown action.')
  if (!ok) throw createError({ statusCode: 409, statusMessage: 'That can\'t be done in the email\'s current state.' })
  const email = await tx.selectFrom('marketing_email').select(['status', 'paused_reason']).where('id', '=', id).executeTakeFirstOrThrow()
  return email
})
