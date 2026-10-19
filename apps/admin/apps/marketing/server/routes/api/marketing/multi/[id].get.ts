import { listUserOrgs } from '#tenant/server'

// The parent with each site's part of the send. Each part is read inside its
// own site, and only on sites where the user can still open site email.
export default defineMarketingUserHandler(async (event, tx, userId) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const parent = await tx.selectFrom('marketing_parent').selectAll().where('id', '=', id).where('owner_user_id', '=', userId).executeTakeFirst()
  if (!parent) marketingNotFound('Send not found.')
  const orgs = parent.org_ids.length ? await tx.selectFrom('orgs').select(['id', 'slug', 'name']).where('id', 'in', parent.org_ids).execute() : []
  const readable = new Set((await listUserOrgs(userId, { orgIds: parent.org_ids, permission: 'marketing.access' as never, appId: 'marketing' })).map(o => o.id))
  const sites = []
  for (const org of orgs) {
    const email = readable.has(org.id)
      ? await marketingInOrg(org.id, t => t
          .selectFrom('marketing_email')
          .select(['id', 'status', 'paused_reason', 'failed_reason', 'recipients', 'sent', 'skipped', 'failed', 'unsubscribes', 'started_at', 'finished_at'])
          .where('parent_id', '=', parent.id)
          .executeTakeFirst())
      : undefined
    sites.push({ ...org, email: email ?? null })
  }
  return { parent, sites }
})
