import { deleteSubscriptionData } from '@prayertools/shared/subscriptions'
import { withManaged } from '../../utils/manage'
import { clearManageCookie } from '../../utils/cookies'
import { limit } from '../../utils/request'

export default defineEventHandler(async (event) => {
  limit(event, 'manage-delete', 5, 60_000)
  await withManaged(event, (tx, sub) => deleteSubscriptionData(tx, sub.id))
  clearManageCookie(event)
  return { ok: true }
})
