// Report a site to Prayer.Tools operators, who can unlist it.
import { useDb } from '../../../../utils/db'
import { limit, readJson, str } from '../../../../utils/request'
import { apiSite } from '../../../../utils/app-api'

export default defineEventHandler(async (event) => {
  limit(event, 'v1-report', 5, 3_600_000)
  const site = await apiSite(getRouterParam(event, 'slug'))
  const body = await readJson(event, 8192)
  const reason = str(body.reason, 60)
  if (!reason) throw createError({ statusCode: 400, statusMessage: 'reason' })
  await useDb().insertInto('pt_site_report').values({ org_id: site.orgId, reason, details: str(body.details, 4000) || null, source: 'app' }).execute()
  setResponseStatus(event, 201)
  return { ok: true }
})
