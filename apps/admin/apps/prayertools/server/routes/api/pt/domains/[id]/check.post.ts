import { hostnameStatus } from '@prayertools/shared/cloudflare'
import { jsonb } from '@prayertools/shared/db/json'

export default definePtHandler('pt.site.manage', async (event, tx, ctx) => {
  const id = getRouterParam(event, 'id')!
  const d = await tx.selectFrom('pt_site_domain').selectAll().where('id', '=', id).where('org_id', '=', ctx.orgId).executeTakeFirst()
  if (!d) ptNotFound('Domain not found.')
  const status = await hostnameStatus(d.hostname, d.cf_hostname_id)
  const row = await tx.updateTable('pt_site_domain').set({
    status: status.status,
    verification: jsonb({ records: status.records.length ? status.records : (d.verification as { records?: unknown }).records, detail: status.detail }),
    last_checked_at: new Date(),
    activated_at: status.status === 'active' ? (d.activated_at ?? new Date()) : d.activated_at,
    failing_since: status.status === 'failing' ? (d.failing_since ?? new Date()) : null
  } as never).where('id', '=', id).returningAll().executeTakeFirstOrThrow()
  return { domain: row }
})
