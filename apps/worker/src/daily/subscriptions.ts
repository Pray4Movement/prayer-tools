// Deletes web signups unverified after 7 days; app subscriptions quiet for 30 days become inactive.
import { sql } from 'kysely'
import { forEachOrg } from '@prayertools/shared/db/scope'
import { VERIFY_TOKEN_DAYS, deleteSubscriptionData, refreshReminders } from '@prayertools/shared/subscriptions'
import type { WorkerContext } from '../context'
import type { Logger } from '../log'
import { DAY, groupBy } from '../util'

export const APP_INACTIVE_DAYS = 30

export async function deleteUnverified(ctx: WorkerContext, log: Logger): Promise<Record<string, number>> {
  const cutoff = new Date(ctx.now().getTime() - VERIFY_TOKEN_DAYS * DAY)
  const due = await sql<{ id: string, org_id: string }>`
    SELECT id::text AS id, org_id::text AS org_id FROM pt_subscription
    WHERE verified_at IS NULL AND delivery = 'email' AND created_at < ${cutoff}::timestamptz
    ORDER BY created_at
    LIMIT 5000
  `.execute(ctx.admin)
  let deleted = 0
  await forEachOrg(ctx.app, groupBy(due.rows, r => r.org_id).keys(), async (tx, orgId) => {
    for (const { id } of due.rows.filter(r => r.org_id === orgId)) {
      const sub = await tx.selectFrom('pt_subscription').select(['verified_at', 'created_at']).where('id', '=', id).executeTakeFirst()
      if (!sub || sub.verified_at || sub.created_at >= cutoff) continue
      await deleteSubscriptionData(tx, id)
      deleted++
    }
  }, (orgId, err) => log.error('unverified_cleanup.failed', { site: orgId, err }))
  return { deleted }
}

export async function appInactivity(ctx: WorkerContext, log: Logger): Promise<Record<string, number>> {
  const now = ctx.now()
  const cutoff = new Date(now.getTime() - APP_INACTIVE_DAYS * DAY)
  const due = await sql<{ id: string, org_id: string }>`
    SELECT id::text AS id, org_id::text AS org_id FROM pt_subscription
    WHERE delivery = 'app' AND status = 'active' AND coalesce(last_activity_at, created_at) < ${cutoff}::timestamptz
  `.execute(ctx.admin)
  let inactive = 0
  await forEachOrg(ctx.app, groupBy(due.rows, r => r.org_id).keys(), async (tx, orgId) => {
    const ids = due.rows.filter(r => r.org_id === orgId).map(r => r.id)
    const updated = await tx
      .updateTable('pt_subscription')
      .set({ status: 'inactive', inactive_at: now, updated_at: now })
      .where('id', 'in', ids)
      .where('status', '=', 'active')
      .where(sql<boolean>`coalesce(last_activity_at, created_at) < ${cutoff}::timestamptz`)
      .returning('id')
      .execute()
    for (const u of updated) await refreshReminders(tx, u.id)
    inactive += updated.length
  }, (orgId, err) => log.error('app_inactivity.failed', { site: orgId, err }))
  return { inactive }
}
