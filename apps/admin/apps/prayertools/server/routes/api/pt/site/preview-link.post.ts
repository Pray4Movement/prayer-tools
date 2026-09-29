// A new preview link for a draft site. Only the hash is stored; creating a
// link invalidates the previous one.
import { randomToken, hashToken } from '@prayertools/shared/tokens'
import { subdomainUrl } from '@prayertools/shared/site'

export default definePtHandler('pt.site.read', async (_event, tx, ctx) => {
  const token = randomToken(24)
  await tx.updateTable('pt_site').set({ preview_token_hash: hashToken(token) }).where('org_id', '=', ctx.orgId).execute()
  return { url: `${subdomainUrl(ctx.orgSlug)}/preview/${token}` }
})
