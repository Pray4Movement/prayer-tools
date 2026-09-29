import { sql } from 'kysely'

export default defineMarketingHandler('marketing.access', async (_event, tx) => {
  const rows = await tx
    .selectFrom('marketing_email')
    .select([
      'id', 'parent_id', 'status', 'audiences', 'source_language', 'scheduled_at', 'started_at', 'finished_at', 'paused_reason',
      'recipients', 'sent', 'skipped', 'failed', 'unsubscribes', 'created_at', 'updated_at',
      sql<string>`versions -> source_language ->> 'subject'`.as('subject')
    ])
    .orderBy('created_at', 'desc')
    .limit(200)
    .execute()
  return { emails: rows }
})
