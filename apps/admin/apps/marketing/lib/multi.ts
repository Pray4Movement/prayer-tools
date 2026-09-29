// Multi-site sends: a parent owned by a user becomes one email per chosen
// site. The children are written in one transaction that switches the org
// scope per site, so a send is created on every site or on none.
import { sql } from 'kysely'
import { cancelEmail, pauseEmail, resumeEmail } from './deliver'
import { jsonb, textArray } from './db'
import type { MarketingDb, MarketingTx } from './types'

async function asOrg(tx: MarketingTx, orgId: string): Promise<void> {
  await sql`select set_config('app.current_org', ${orgId}, true)`.execute(tx)
}

export async function scheduleParent(db: MarketingDb, parentId: string, ownerUserId: string, scheduledAt: Date): Promise<boolean> {
  return await db.transaction().execute(async (tx) => {
    const parent = await tx
      .selectFrom('marketing_parent')
      .selectAll()
      .where('id', '=', parentId)
      .where('owner_user_id', '=', ownerUserId)
      .where('status', '=', 'draft')
      .forUpdate()
      .executeTakeFirst()
    if (!parent) return false
    for (const orgId of parent.org_ids) {
      await asOrg(tx, orgId)
      await tx.insertInto('marketing_email').values({
        parent_id: parent.id,
        versions: jsonb(parent.versions),
        source_language: parent.source_language,
        audiences: textArray(parent.audiences),
        status: 'scheduled',
        scheduled_at: scheduledAt,
        created_by: ownerUserId
      }).execute()
    }
    await tx.updateTable('marketing_parent').set({ status: 'scheduled', scheduled_at: scheduledAt, updated_at: new Date() }).where('id', '=', parent.id).execute()
    return true
  })
}

export type ParentAction = 'cancel' | 'pause' | 'resume'

export async function actOnParent(db: MarketingDb, parentId: string, ownerUserId: string, action: ParentAction): Promise<boolean> {
  return await db.transaction().execute(async (tx) => {
    const parent = await tx.selectFrom('marketing_parent').selectAll().where('id', '=', parentId).where('owner_user_id', '=', ownerUserId).forUpdate().executeTakeFirst()
    if (!parent) return false
    const now = new Date()
    const next = action === 'cancel'
      ? (['scheduled', 'sending', 'paused'].includes(parent.status) ? 'cancelled' : null)
      : action === 'pause'
        ? (parent.status === 'sending' ? 'paused' : null)
        : (parent.status === 'paused' ? 'sending' : null)
    if (!next) return false
    for (const orgId of parent.org_ids) {
      await asOrg(tx, orgId)
      const children = await tx.selectFrom('marketing_email').select('id').where('parent_id', '=', parent.id).execute()
      for (const c of children) {
        if (action === 'cancel') await cancelEmail(tx, c.id, now)
        else if (action === 'pause') await pauseEmail(tx, c.id, now)
        else await resumeEmail(tx, c.id, now)
      }
    }
    await tx.updateTable('marketing_parent').set({
      status: next,
      updated_at: now,
      ...(next === 'cancelled' ? { finished_at: now } : {})
    }).where('id', '=', parent.id).execute()
    return true
  })
}
