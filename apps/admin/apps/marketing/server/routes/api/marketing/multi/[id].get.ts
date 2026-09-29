import { db } from '#core/server/utils/database'

// The parent with each site's part of the send.
export default defineMarketingUserHandler(async (event, userId) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const parent = await db.selectFrom('marketing_parent').selectAll().where('id', '=', id).where('owner_user_id', '=', userId).executeTakeFirst()
  if (!parent) marketingNotFound('Send not found.')
  const orgs = parent.org_ids.length ? await db.selectFrom('orgs').select(['id', 'slug', 'name']).where('id', 'in', parent.org_ids).execute() : []
  const member = new Set((await db.selectFrom('memberships').select('org_id').where('user_id', '=', userId).execute()).map(m => m.org_id))
  const sites = []
  for (const org of orgs) {
    const email = member.has(org.id)
      ? await marketingInOrg(org.id, tx => tx
          .selectFrom('marketing_email')
          .select(['id', 'status', 'paused_reason', 'recipients', 'sent', 'skipped', 'failed', 'unsubscribes', 'started_at', 'finished_at'])
          .where('parent_id', '=', parent.id)
          .executeTakeFirst())
      : null
    sites.push({ ...org, email: email ?? null })
  }
  return { parent, sites }
})
