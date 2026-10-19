// Every intercessor export on the platform: who, which site, when.
import { requireOperatorAdmin } from '#tenant/server'

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  const exports = await ptAdminDb().selectFrom('pt_export_log as e').innerJoin('users as u', 'u.id', 'e.user_id').innerJoin('orgs as o', 'o.id', 'e.org_id')
    .select(['e.id', 'e.row_count', 'e.created_at', 'u.email', 'u.display_name', 'o.name as site_name', 'o.slug as site_slug'])
    .orderBy('e.created_at', 'desc').limit(300).execute()
  return { exports }
})
