// Deletes the site and everything in it. Owners only; the name must be typed
// to confirm. Custom hostnames are removed from Cloudflare first.
import { deleteHostname } from '@prayertools/shared/cloudflare'

export default definePtHandler('pt.site.manage', async (event, tx, ctx) => {
  if (!ctx.roles.includes('admin')) throw createError({ statusCode: 403, statusMessage: 'Only owners can delete a site.' })
  const { confirm } = await ptBody<{ confirm?: string }>(event)
  if (confirm !== ctx.orgSlug) ptBadRequest('Type the site address to confirm.')
  const domains = await tx.selectFrom('pt_site_domain').select('cf_hostname_id').where('org_id', '=', ctx.orgId).execute()
  for (const d of domains) await deleteHostname(d.cf_hostname_id).catch(err => console.warn('[pt] cloudflare delete', err))
  const nitro = useNitroApp()
  await (nitro.hooks.callHook as (n: string, p: unknown) => Promise<void>)('org.deleted', { orgId: ctx.orgId, slug: ctx.orgSlug }).catch(() => {})
  await tx.deleteFrom('orgs').where('id', '=', ctx.orgId).execute()
  return { ok: true }
})
