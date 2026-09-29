import { audienceCounts, collectRecipients } from '../../../../../lib/audiences'
import { addressFingerprint } from '../../../../../lib/tokens'

// Audiences of each chosen site with eligible counts, and how many people the
// send reaches once each person counts once across the sites.
export default defineMarketingUserHandler(async (event, userId) => {
  const b = await marketingBody<{ org_ids?: unknown, selected?: unknown }>(event)
  const sites = await marketingRequireSites(userId, b.org_ids)
  const selected = Array.isArray(b.selected) ? b.selected.map(s => String(s)) : []
  const host = marketingHost()
  const people = new Set<string>()
  const perSite = []
  for (const site of sites) {
    const counts = await marketingInOrg(site.id, async (tx) => {
      const c = await audienceCounts(host, tx, site.id, selected)
      if (selected.length) {
        for (const r of (await collectRecipients(host, tx, site.id, selected)).eligible) people.add(addressFingerprint(r.address))
      }
      return c
    })
    perSite.push({ site, ...counts })
  }
  return { sites: perSite, people: people.size }
})
