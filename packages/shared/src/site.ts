// Site addressing and settings. A site is reachable at `{slug}.<base host>`
// always, and at its custom domain once Cloudflare reports it active — which
// then becomes the canonical address.
import { sql } from 'kysely'
import { platformConfig } from './config'
import { withOrg, type Db, type Tx } from './db/scope'
import type { SiteStatus } from './db/schema'

export function subdomainUrl(slug: string): string {
  const c = platformConfig()
  return `${c.siteScheme}://${slug}.${c.siteBaseHost}`
}

export function siteUrl(slug: string, activeDomain?: string | null): string {
  if (activeDomain) return `https://${activeDomain}`
  return subdomainUrl(slug)
}

export async function activeDomainFor(db: Db | Tx, orgId: string): Promise<string | null> {
  const row = await db
    .selectFrom('pt_site_domain')
    .select('hostname')
    .where('org_id', '=', orgId)
    .where('status', '=', 'active')
    .orderBy('activated_at', 'asc')
    .executeTakeFirst()
  return row?.hostname ?? null
}

export async function siteUrlFor(db: Db | Tx, orgId: string, slug: string): Promise<string> {
  return siteUrl(slug, await activeDomainFor(db, orgId))
}

// What a request host means.
export type HostKind =
  | { kind: 'platform' }
  | { kind: 'api' }
  | { kind: 'go' }
  | { kind: 'site', slug: string }
  | { kind: 'custom', hostname: string }

export function classifyHost(rawHost: string): HostKind {
  const c = platformConfig()
  const host = rawHost.toLowerCase().replace(/\.$/, '')
  if (host === c.apiHost) return { kind: 'api' }
  if (host === c.goHost) return { kind: 'go' }
  if (host === c.platformHost || host === `www.${c.platformHost}`) return { kind: 'platform' }
  const suffix = `.${c.siteBaseHost}`
  if (host.endsWith(suffix)) {
    const slug = host.slice(0, -suffix.length)
    if (slug && !slug.includes('.')) return { kind: 'site', slug }
  }
  return { kind: 'custom', hostname: host.replace(/:\d+$/, '') }
}

export interface ResolvedSite {
  orgId: string
  slug: string
  name: string
  status: SiteStatus
  suspended: boolean
  activeDomain: string | null
  // True when the request came in on the subdomain but a custom domain is
  // active, so the page should redirect to the canonical address.
  shouldRedirect: boolean
}

// Hostname → site. Reads only global tables (orgs, pt_site_domain), so it
// runs before any org scope exists. Unknown hosts resolve to null (404),
// never to a default site.
export async function resolveSiteByHost(db: Db, rawHost: string): Promise<ResolvedSite | null> {
  const kind = classifyHost(rawHost)
  if (kind.kind === 'site') {
    const org = await db.selectFrom('orgs').select(['id', 'slug', 'name', 'suspended_at']).where('slug', '=', kind.slug).executeTakeFirst()
    if (!org) return null
    const status = await siteStatusOf(db, org.id)
    if (!status) return null
    const activeDomain = await activeDomainFor(db, org.id)
    return { orgId: org.id, slug: org.slug, name: org.name, status, suspended: !!org.suspended_at, activeDomain, shouldRedirect: !!activeDomain }
  }
  if (kind.kind === 'custom') {
    const domain = await db
      .selectFrom('pt_site_domain')
      .innerJoin('orgs', 'orgs.id', 'pt_site_domain.org_id')
      .select(['orgs.id as id', 'orgs.slug as slug', 'orgs.name as name', 'orgs.suspended_at as suspended_at', 'pt_site_domain.status as domain_status'])
      .where(eb => eb.fn('lower', ['pt_site_domain.hostname']), '=', kind.hostname)
      .executeTakeFirst()
    if (!domain || domain.domain_status === 'pending') return null
    const status = await siteStatusOf(db, domain.id)
    if (!status) return null
    return {
      orgId: domain.id,
      slug: domain.slug,
      name: domain.name,
      status,
      suspended: !!domain.suspended_at,
      activeDomain: domain.domain_status === 'active' ? kind.hostname : null,
      shouldRedirect: false
    }
  }
  return null
}

// pt_site is org-scoped, so its status is read inside the org.
async function siteStatusOf(db: Db, orgId: string): Promise<SiteStatus | null> {
  return await withOrg(db, orgId, async (tx) => {
    const row = await tx.selectFrom('pt_site').select('status').executeTakeFirst()
    return row?.status ?? null
  })
}

// ── Settings: code-owned defaults, DB overrides ────────────────────────────

export const SITE_SETTING_DEFAULTS = {
  checkins_enabled: true,
  show_people_count: true,
  show_praying_now: true,
  default_duration_min: 15,
  share_prompts: true,
  auto_ack_contact: true
} as const

export type SiteSettings = { -readonly [K in keyof typeof SITE_SETTING_DEFAULTS]: (typeof SITE_SETTING_DEFAULTS)[K] extends boolean ? boolean : number }

export function siteSettings(overrides: Record<string, unknown> | null | undefined): SiteSettings {
  const out = { ...SITE_SETTING_DEFAULTS } as SiteSettings
  for (const [k, def] of Object.entries(SITE_SETTING_DEFAULTS)) {
    const v = overrides?.[k]
    if (v !== undefined && typeof v === typeof def) (out as Record<string, unknown>)[k] = v
  }
  return out
}

// Keeps only values that differ from the code default.
export function settingsOverrides(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, def] of Object.entries(SITE_SETTING_DEFAULTS)) {
    const v = values[k]
    if (v !== undefined && typeof v === typeof def && v !== def) out[k] = v
  }
  return out
}

// Apps every site has on. They are host-controlled: a site gets them when it
// is created, and its owners can't switch them off.
export const PT_ORG_APPS = ['site', 'crm', 'inbox', 'marketing'] as const

// The champion's personal app: their templates, images and blocks, and their
// sends to several sites.
export const PT_LIBRARY_APP = 'library'

// Turns every site app on for an org (a new site, or the staff org).
export async function enableSiteApps(db: Db | Tx, orgId: string): Promise<void> {
  const apps = sql.join(PT_ORG_APPS.map(id => sql`(${id})`))
  await sql`INSERT INTO apps (id) VALUES ${apps} ON CONFLICT (id) DO NOTHING`.execute(db)
  await sql`
    INSERT INTO org_apps (org_id, app_id, enabled, source, updated_at)
    SELECT ${orgId}::uuid, id, true, 'host', now() FROM (VALUES ${apps}) AS a(id)
    ON CONFLICT (org_id, app_id) DO UPDATE SET enabled = true, source = 'host', updated_at = now()
  `.execute(db)
}
