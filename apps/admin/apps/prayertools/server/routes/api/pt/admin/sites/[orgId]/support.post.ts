// Operator support access: adds the operator to the site's team as an owner
// so the site's screens open for them. Logged in the activity log.
import { requireOperatorAdmin } from '#tenant/server'
import { logEvent } from '#core/server/utils/activity-logger'

export default defineEventHandler(async (event) => {
  const { userId } = await requireOperatorAdmin(event)
  const orgId = getRouterParam(event, 'orgId')!
  const org = await ptAdminDb().selectFrom('orgs').select(['id', 'slug']).where('id', '=', orgId).executeTakeFirst()
  if (!org) ptNotFound('Site not found.')
  const now = new Date()
  await ptAdminDb().insertInto('memberships').values({ user_id: userId, org_id: orgId, roles: ['admin'] as never, created_at: now, updated_at: now })
    .onConflict(oc => oc.columns(['user_id', 'org_id']).doNothing()).execute()
  logEvent({ eventType: 'pt_operator_support_access', userId, metadata: { orgId } }).catch(() => {})
  return { slug: org.slug }
})
