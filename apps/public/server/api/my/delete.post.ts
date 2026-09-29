// Delete my data on every site, then the global identity once nothing else
// (another subscription or an app device) refers to it.
import { withOrg, withPerson } from '@prayertools/shared/db/scope'
import { deleteSubscriptionData } from '@prayertools/shared/subscriptions'
import { useDb } from '../../utils/db'
import { clearMyCookie } from '../../utils/cookies'
import { limit } from '../../utils/request'
import { personSubscriptions, requireMySession } from '../../utils/my'

export default defineEventHandler(async (event) => {
  limit(event, 'my-delete', 3, 60_000)
  const intercessorId = await requireMySession(event)
  for (const s of await personSubscriptions(intercessorId)) {
    await withOrg(useDb(), s.org_id, tx => deleteSubscriptionData(tx, s.id))
  }
  await withPerson(useDb(), intercessorId, async (tx) => {
    const left = await tx.selectFrom('pt_subscription').select('id').where('intercessor_id', '=', intercessorId).executeTakeFirst()
    const device = await tx.selectFrom('pt_intercessor_device').select('id').where('intercessor_id', '=', intercessorId).executeTakeFirst()
    if (!left && !device) await tx.deleteFrom('pt_intercessor').where('id', '=', intercessorId).execute()
    else await tx.updateTable('pt_my_session').set({ revoked_at: new Date() }).where('intercessor_id', '=', intercessorId).execute()
  })
  clearMyCookie(event)
  return { ok: true }
})
