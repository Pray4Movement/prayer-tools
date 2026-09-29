// Your sites: every site the user belongs to, with role, status, live
// address, current or next campaign and people count. Each site is read
// inside its own org.
import { requireAuth } from '#core/server/utils/auth'
import { db } from '#core/server/utils/database'
import { withOrg } from '@prayertools/shared/db/scope'
import { pickCurrentCampaign } from '@prayertools/shared/setup'
import { peopleCount } from '@prayertools/shared/stats'
import { siteUrlFor } from '@prayertools/shared/site'
import { normalizeCampaign } from '@prayertools/shared/subscriptions'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const memberships = await db
    .selectFrom('memberships')
    .innerJoin('orgs', 'orgs.id', 'memberships.org_id')
    .select(['orgs.id', 'orgs.slug', 'orgs.name', 'orgs.suspended_at', 'memberships.roles', 'memberships.created_at'])
    .where('memberships.user_id', '=', user.userId)
    .orderBy('orgs.name')
    .execute()

  const sites = []
  for (const m of memberships) {
    const info = await withOrg(ptAppDb(db), m.id, async (tx) => {
      const site = await tx.selectFrom('pt_site').select(['status', 'onboarding']).executeTakeFirst()
      if (!site) return null
      const campaigns = (await tx.selectFrom('pt_campaign').selectAll().execute()).map(normalizeCampaign)
      const current = pickCurrentCampaign(campaigns)
      return {
        status: site.status,
        onboarding: site.onboarding,
        url: await siteUrlFor(tx, m.id, m.slug),
        campaign: current ? { id: current.campaign.id, name: current.campaign.name, state: current.state, start_date: current.campaign.start_date } : null,
        people: current ? await peopleCount(tx, current.campaign) : 0
      }
    })
    if (!info) continue
    sites.push({
      id: m.id,
      slug: m.slug,
      name: m.name,
      suspended: !!m.suspended_at,
      roles: m.roles,
      joined_at: m.created_at,
      recently_added: Date.now() - new Date(m.created_at).getTime() < 7 * 86_400_000 && !m.roles.includes('admin'),
      ...info
    })
  }
  return { sites }
})
