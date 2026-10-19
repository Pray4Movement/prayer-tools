// Unsubscribing from a site email withdraws consent for the email's audience
// purposes on that site. From a multi-site send it does so on every chosen
// site where the address has a channel, one consent-log withdrawal per site.
// The token names a delivery; everything else is read inside each site's org,
// including the send's chosen sites, which each site's email carries.
import { audiencesByKey, defaultFindChannel } from './audiences'
import { inOrg } from './db'
import { verifyToken, type UnsubscribePayload } from './tokens'
import type { ConsentWithdrawal, MarketingDb, MarketingHost, MarketingTx } from './types'

export interface UnsubscribeInfo {
  test: boolean
  address: string
  sites: { id: string, name: string }[]
}

export function maskAddress(address: string): string {
  const [local = '', domain = ''] = address.split('@')
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(1, Math.min(local.length - 1, 6)))}@${domain}`
}

interface Target {
  orgId: string
  emailId: string
  channelId: string
  address: string
  purpose: string | null
  parentId: string | null
  parentOrgIds: string[]
}

// The delivery the token names, inside its site.
async function findTarget(db: MarketingDb, p: UnsubscribePayload): Promise<Target | null> {
  if (!p.d) return null
  return await inOrg(db, p.o, async (tx) => {
    const row = await tx
      .selectFrom('marketing_delivery as d')
      .innerJoin('marketing_email as e', 'e.id', 'd.email_id')
      .innerJoin('crm_channels as c', 'c.id', 'd.channel_id')
      .select(['d.email_id', 'd.channel_id', 'd.purpose', 'e.parent_id', 'e.parent_org_ids', 'c.normalized_value'])
      .where('d.id', '=', p.d!)
      .executeTakeFirst()
    if (!row?.channel_id) return null
    return { orgId: p.o, emailId: row.email_id, channelId: row.channel_id, address: row.normalized_value, purpose: row.purpose, parentId: row.parent_id, parentOrgIds: row.parent_org_ids }
  })
}

function targetOrgs(t: Target): string[] {
  return [...new Set([t.orgId, ...t.parentOrgIds])]
}

export async function describeUnsubscribe(host: MarketingHost, db: MarketingDb, token: string): Promise<UnsubscribeInfo | null> {
  const p = verifyToken(token, host.secret())
  if (!p) return null
  if (p.t) {
    const org = await db.selectFrom('orgs').select(['id', 'name']).where('id', '=', p.o).executeTakeFirst()
    return { test: true, address: '', sites: org ? [org] : [] }
  }
  const t = await findTarget(db, p)
  if (!t) return null
  const ids = targetOrgs(t)
  const orgs = await db.selectFrom('orgs').select(['id', 'name']).where('id', 'in', ids).execute()
  return { test: false, address: maskAddress(t.address), sites: ids.map(id => orgs.find(o => o.id === id)).filter(o => !!o).map(o => ({ id: o!.id, name: o!.name })) }
}

export interface UnsubscribeResult {
  test: boolean
  withdrawn: number
  sites: string[]
}

async function purposesOf(host: MarketingHost, tx: MarketingTx, orgId: string, emails: { audiences: string[] }[]): Promise<Set<string>> {
  const known = await audiencesByKey(host, tx, orgId)
  return new Set(emails.flatMap(e => e.audiences).map(k => known.get(k)?.purpose).filter((x): x is string => !!x))
}

export async function applyUnsubscribe(host: MarketingHost, db: MarketingDb, token: string, capture: ConsentWithdrawal): Promise<UnsubscribeResult | null> {
  const p = verifyToken(token, host.secret())
  if (!p) return null
  if (p.t) return { test: true, withdrawn: 0, sites: [] }
  const t = await findTarget(db, p)
  if (!t) return null
  let withdrawn = 0
  const sites: string[] = []
  for (const orgId of targetOrgs(t)) {
    const changed = await inOrg(db, orgId, async (tx) => {
      const emails = t.parentId
        ? await tx.selectFrom('marketing_email').select(['id', 'audiences']).where('parent_id', '=', t.parentId).execute()
        : await tx.selectFrom('marketing_email').select(['id', 'audiences']).where('id', '=', t.emailId).execute()
      const purposes = await purposesOf(host, tx, orgId, emails)
      if (orgId === t.orgId && t.purpose) purposes.add(t.purpose)
      if (!purposes.size) return 0
      const channelId = orgId === t.orgId
        ? t.channelId
        : host.findChannel ? await host.findChannel(tx, orgId, t.address) : await defaultFindChannel(tx, orgId, t.address)
      if (!channelId) return 0
      let n = 0
      for (const purpose of purposes) {
        if (await host.withdrawConsent(tx, channelId, purpose, capture)) n++
      }
      if (n && orgId === t.orgId) {
        await tx.updateTable('marketing_email').set(eb => ({ unsubscribes: eb('unsubscribes', '+', 1) })).where('id', '=', t.emailId).execute()
      }
      return n
    })
    if (changed) {
      withdrawn += changed
      sites.push(orgId)
    }
  }
  return { test: false, withdrawn, sites }
}
