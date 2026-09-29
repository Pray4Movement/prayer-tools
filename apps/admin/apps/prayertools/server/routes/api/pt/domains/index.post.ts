// Adds a custom domain: provisioned through Cloudflare for SaaS, verified
// once the champion's CNAME points at the fallback origin. A domain belongs to
// one site only.
import { createHostname, HOSTNAME_RE } from '@prayertools/shared/cloudflare'
import { platformConfig } from '@prayertools/shared/config'
import { jsonb } from '@prayertools/shared/db/json'

export default definePtHandler('pt.site.manage', async (event, tx, ctx) => {
  const { hostname } = await ptBody<{ hostname?: string }>(event)
  const host = String(hostname ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '')
  if (!HOSTNAME_RE.test(host)) ptBadRequest('Enter a domain like pray.example.org.')
  const base = platformConfig().siteBaseHost.split(':')[0]!
  if (host === base || host.endsWith(`.${base}`)) ptBadRequest(`${base} addresses are built in; add your own domain here.`)
  const taken = await tx.selectFrom('pt_site_domain').select('org_id').where(eb => eb.fn('lower', ['hostname']), '=', host).executeTakeFirst()
  if (taken) ptBadRequest('This domain is already connected to a site. Remove it there first.')
  const count = await tx.selectFrom('pt_site_domain').select(eb => eb.fn.countAll<string>().as('n')).where('org_id', '=', ctx.orgId).executeTakeFirst()
  if (Number(count?.n ?? 0) >= 3) ptBadRequest('A site can have up to three custom domains.')
  const status = await createHostname(host)
  const row = await tx.insertInto('pt_site_domain').values({
    org_id: ctx.orgId,
    hostname: host,
    status: status.status,
    cf_hostname_id: status.id,
    verification: jsonb({ records: status.records, detail: status.detail }),
    last_checked_at: new Date(),
    activated_at: status.status === 'active' ? new Date() : null
  } as never).returningAll().executeTakeFirstOrThrow()
  return { domain: row }
})
