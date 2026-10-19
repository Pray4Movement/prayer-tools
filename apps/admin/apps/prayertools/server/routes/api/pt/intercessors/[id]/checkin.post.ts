// Sends a check-in email now (the worker delivers it).
import { enqueue } from '@prayertools/shared/jobs'

export default definePtHandler('pt.intercessors.write', async (event, tx, ctx) => {
  const id = getRouterParam(event, 'id')!
  const sub = await tx.selectFrom('pt_subscription').select(['id', 'status', 'verified_at', 'delivery']).where('id', '=', id).executeTakeFirst()
  if (!sub) ptNotFound('Intercessor not found.')
  if (sub.delivery !== 'email' || !sub.verified_at || sub.status === 'unsubscribed') ptBadRequest('Check-ins go to verified email subscribers who haven\'t unsubscribed.')
  await enqueue(ptTx(tx), 'checkin_email', { subscriptionId: id, kind: 'manual' }, { orgId: ctx.orgId, referenceType: 'checkin', referenceId: id })
  return { ok: true }
})
