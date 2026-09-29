import { deleteSubscriptionData } from '@prayertools/shared/subscriptions'

export default definePtHandler('pt.intercessors.write', async (event, tx) => {
  await deleteSubscriptionData(ptTx(tx), getRouterParam(event, 'id')!)
  return { ok: true }
})
