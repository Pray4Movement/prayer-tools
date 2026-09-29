import { sql } from 'kysely'
import { db } from '#core/server/utils/database'

export default defineMarketingUserHandler(async (_event, userId) => {
  const parents = await db
    .selectFrom('marketing_parent')
    .select([
      'id', 'status', 'org_ids', 'audiences', 'source_language', 'scheduled_at', 'started_at', 'finished_at',
      'people', 'recipients', 'sent', 'skipped', 'failed', 'unsubscribes', 'created_at', 'updated_at',
      sql<string>`versions -> source_language ->> 'subject'`.as('subject')
    ])
    .where('owner_user_id', '=', userId)
    .orderBy('created_at', 'desc')
    .limit(200)
    .execute()
  const orgIds = [...new Set(parents.flatMap(p => p.org_ids))]
  const orgs = orgIds.length ? await db.selectFrom('orgs').select(['id', 'name']).where('id', 'in', orgIds).execute() : []
  return { parents, siteNames: Object.fromEntries(orgs.map(o => [o.id, o.name])) }
})
