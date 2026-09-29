// When an owner leaves, an operator can make another member an owner.
import { requireOperatorAdmin } from '#tenant/server'
import { logEvent } from '#core/server/utils/activity-logger'
import { sql } from 'kysely'

export default defineEventHandler(async (event) => {
  const { userId: operatorId } = await requireOperatorAdmin(event)
  const orgId = getRouterParam(event, 'orgId')!
  const { userId } = await ptBody<{ userId?: string }>(event)
  const res = await ptAdminDb().updateTable('memberships')
    .set({ roles: sql`array_append(array_remove(roles, 'admin'), 'admin')`, updated_at: new Date() })
    .where('org_id', '=', orgId).where('user_id', '=', String(userId)).executeTakeFirst()
  if (!Number(res.numUpdatedRows)) ptNotFound('That person is not on this site\'s team.')
  logEvent({ eventType: 'pt_operator_assign_owner', userId: operatorId, metadata: { orgId, newOwner: userId } }).catch(() => {})
  return { ok: true }
})
