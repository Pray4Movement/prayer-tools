import { renderEmail } from '../../../../lib/render'
import { signToken, unsubscribeUrls } from '../../../../lib/tokens'

// Server-rendered preview with sample values for the placeholders.
export default defineMarketingHandler('marketing.access', async (event, tx, ctx) => {
  const host = marketingHost()
  const b = await marketingBody(event)
  const { languages } = await host.languages(marketingTx(tx), ctx.orgId)
  const input = marketingDraftInput(b, languages.map(l => l.code))
  const lang = typeof b.lang === 'string' && languages.some(l => l.code === b.lang) ? b.lang : input.sourceLanguage
  const token = signToken({ o: ctx.orgId, t: true }, host.secret())
  const rendered = await renderEmail(host, marketingTx(tx), ctx.orgId, { versions: input.versions, source_language: input.sourceLanguage }, lang, null, {
    unsubscribeUrl: unsubscribeUrls(host.unsubscribeBaseUrl(), token).page,
    test: false
  })
  return rendered
})
