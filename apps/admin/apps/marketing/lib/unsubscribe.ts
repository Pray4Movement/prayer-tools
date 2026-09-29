// Unsubscribing from a site email withdraws consent for the email's audience
// purposes on that site. From a multi-site send it does so on every chosen
// site where the address has a channel, one consent-log withdrawal per site.
import { audiencesByKey, defaultFindChannel } from './audiences'
import { inOrg } from './db'
import { verifyToken, type UnsubscribePayload } from './tokens'
import type { ConsentWithdrawal, MarketingDb, MarketingHost } from './types'

export interface UnsubscribeInfo {
  test: boolean
  address: string
  sites: { id: string, name: string }[]
}

export function maskAddress(address: string): string {
  const [local = '', domain = ''] = address.split('@')
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(1, Math.min(local.length - 1, 6)))}@${domain}`
}

async function targetOrgs(db: MarketingDb, p: UnsubscribePayload): Promise<string[]> {
  if (!p.p) return [p.o]
  const parent = await db.selectFrom('marketing_parent').select('org_ids').where('id', '=', p.p).executeTakeFirst()
  return parent?.org_ids?.length ? [...new Set([p.o, ...parent.org_ids])] : [p.o]
}

export async function describeUnsubscribe(host: MarketingHost, db: MarketingDb, token: string): Promise<UnsubscribeInfo | null> {
  const p = verifyToken(token, host.secret())
  if (!p) return null
  const ids = await targetOrgs(db, p)
  const orgs = await db.selectFrom('orgs').select(['id', 'name']).where('id', 'in', ids).execute()
  return { test: !!p.t, address: maskAddress(p.a), sites: ids.map(id => orgs.find(o => o.id === id)).filter(o => !!o).map(o => ({ id: o!.id, name: o!.name })) }
}

export interface UnsubscribeResult {
  test: boolean
  withdrawn: number
  sites: string[]
}

export async function applyUnsubscribe(host: MarketingHost, db: MarketingDb, token: string, capture: ConsentWithdrawal): Promise<UnsubscribeResult | null> {
  const p = verifyToken(token, host.secret())
  if (!p) return null
  if (p.t) return { test: true, withdrawn: 0, sites: [] }
  let withdrawn = 0
  const sites: string[] = []
  for (const orgId of await targetOrgs(db, p)) {
    const changed = await inOrg(db, orgId, async (tx) => {
      const emails = p.p
        ? await tx.selectFrom('marketing_email').select(['id', 'audiences']).where('parent_id', '=', p.p).execute()
        : await tx.selectFrom('marketing_email').select(['id', 'audiences']).where('id', '=', p.e ?? '00000000-0000-0000-0000-000000000000').execute()
      const known = await audiencesByKey(host, tx, orgId)
      const purposes = new Set(emails.flatMap(e => e.audiences).map(k => known.get(k)?.purpose).filter((x): x is string => !!x))
      if (!p.p && p.d) {
        const d = await tx.selectFrom('marketing_delivery').select('purpose').where('id', '=', p.d).executeTakeFirst()
        if (d?.purpose) purposes.add(d.purpose)
      }
      if (!purposes.size) return 0
      const channelId = host.findChannel ? await host.findChannel(tx, orgId, p.a) : await defaultFindChannel(tx, orgId, p.a)
      if (!channelId) return 0
      let n = 0
      for (const purpose of purposes) {
        if (await host.withdrawConsent(tx, channelId, purpose, capture)) n++
      }
      if (n && orgId === p.o && p.e) {
        await tx.updateTable('marketing_email').set(eb => ({ unsubscribes: eb('unsubscribes', '+', 1) })).where('id', '=', p.e!).execute()
      }
      return n
    })
    if (changed) {
      withdrawn += changed
      sites.push(orgId)
    }
  }
  if (withdrawn && p.p) {
    await db.updateTable('marketing_parent').set(eb => ({ unsubscribes: eb('unsubscribes', '+', 1) })).where('id', '=', p.p!).execute()
  }
  return { test: false, withdrawn, sites }
}
