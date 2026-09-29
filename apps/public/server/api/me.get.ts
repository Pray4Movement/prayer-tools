// What this browser's manage cookie says about the visitor on this site
// (share link code, story form prefill). Private; never cached.
import { withOrg } from '@prayertools/shared/db/scope'
import { primaryEmailOf } from '@prayertools/shared/crm'
import { useDb } from '../utils/db'
import { siteContext } from '../utils/site-context'
import { managedSubscription } from '../utils/manage'
import { readManageCookie } from '../utils/cookies'

export default defineEventHandler(async (event) => {
  const ctx = siteContext(event)
  if (!readManageCookie(event, ctx.orgId)) return { referral_code: null, email: null, name: null }
  return await withOrg(useDb(), ctx.orgId, async (tx) => {
    const sub = await managedSubscription(tx, event, ctx.orgId)
    if (!sub) return { referral_code: null, email: null, name: null }
    const email = sub.contact_id ? await primaryEmailOf(tx, sub.contact_id) : null
    const contact = sub.contact_id ? await tx.selectFrom('crm_records').select('name').where('id', '=', sub.contact_id).executeTakeFirst() : null
    return { referral_code: sub.referral_code, email: email?.email ?? null, name: contact?.name ?? null }
  })
})
