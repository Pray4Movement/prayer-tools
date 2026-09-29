import { renderEmail } from '../../../../../lib/render'
import { signToken, unsubscribeUrls } from '../../../../../lib/tokens'

// Preview as one of the chosen sites (its branding and placeholder values).
export default defineMarketingUserHandler(async (event, userId) => {
  const b = await marketingBody(event)
  const [site] = await marketingRequireSites(userId, [b.org_id])
  const host = marketingHost()
  const input = marketingDraftInput(b, Object.keys((b.versions ?? {}) as object).concat(String(b.source_language ?? '')))
  const lang = typeof b.lang === 'string' ? b.lang : input.sourceLanguage
  const user = await marketingUserEmail(userId)
  const token = signToken({ o: site!.id, a: user.email, t: true }, host.secret())
  return await marketingInOrg(site!.id, tx => renderEmail(host, tx, site!.id, { versions: input.versions, source_language: input.sourceLanguage }, lang, null, {
    unsubscribeUrl: unsubscribeUrls(host.unsubscribeBaseUrl(), token).page,
    test: false
  }))
})
