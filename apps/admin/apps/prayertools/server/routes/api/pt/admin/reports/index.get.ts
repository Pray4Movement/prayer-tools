import { requireOperatorAdmin } from '#tenant/server'

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  const reports = await ptAdminDb().selectFrom('pt_site_report as r').innerJoin('orgs as o', 'o.id', 'r.org_id')
    .select(['r.id', 'r.org_id', 'r.reason', 'r.details', 'r.source', 'r.created_at', 'r.handled_at', 'o.name as site_name', 'o.slug as site_slug'])
    .orderBy('r.handled_at', 'desc').orderBy('r.created_at', 'desc').limit(300).execute()
  return { reports }
})
