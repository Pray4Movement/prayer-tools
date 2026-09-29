// Prayer.Tools staff read every story, across all sites.
import { requireOperatorAdmin } from '#tenant/server'

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  const stories = await ptAdminDb().selectFrom('pt_story as s').innerJoin('orgs as o', 'o.id', 's.org_id')
    .select(['s.id', 's.body', 's.name', 's.language', 's.may_publish', 's.may_platform', 's.use_name', 's.published', 's.created_at', 'o.name as site_name', 'o.slug as site_slug'])
    .orderBy('s.created_at', 'desc').limit(500).execute()
  return { stories }
})
