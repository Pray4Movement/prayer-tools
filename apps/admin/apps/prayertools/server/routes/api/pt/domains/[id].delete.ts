// Removing a domain deletes it from Cloudflare immediately, so nobody else
// can take it over while it still points at us.
import { deleteHostname } from '@prayertools/shared/cloudflare'

export default definePtHandler('pt.site.manage', async (event, tx, ctx) => {
  const id = getRouterParam(event, 'id')!
  const d = await tx.selectFrom('pt_site_domain').selectAll().where('id', '=', id).where('org_id', '=', ctx.orgId).executeTakeFirst()
  if (!d) ptNotFound('Domain not found.')
  await deleteHostname(d.cf_hostname_id)
  await tx.deleteFrom('pt_site_domain').where('id', '=', id).execute()
  return { ok: true }
})
