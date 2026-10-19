import { renderEmail } from '../../../../lib/render'
import { signToken, unsubscribeUrls } from '../../../../lib/tokens'

// "Send me a test": to the signed-in user, with the test banner and an
// unsubscribe link that changes nothing.
export default defineMarketingHandler('marketing.send', async (event, tx, ctx) => {
  const host = marketingHost()
  const b = await marketingBody(event)
  const { languages } = await host.languages(marketingTx(tx), ctx.orgId)
  const input = marketingDraftInput(b, languages.map(l => l.code))
  const lang = typeof b.lang === 'string' && languages.some(l => l.code === b.lang) ? b.lang : input.sourceLanguage
  const user = await marketingUserEmail(ctx.userId)
  const urls = unsubscribeUrls(host.unsubscribeBaseUrl(), signToken({ o: ctx.orgId, t: true }, host.secret()))
  const firstName = user.name.trim().split(/\s+/)[0] || ''
  const rendered = await renderEmail(host, marketingTx(tx), ctx.orgId, { versions: input.versions, source_language: input.sourceLanguage }, lang,
    { contactId: null, channelId: null, address: user.email, language: lang, firstName }, { unsubscribeUrl: urls.page, test: true })
  const sender = await host.sender(marketingTx(tx), ctx.orgId)
  await host.send({
    to: user.email,
    fromName: sender.fromName,
    fromLocal: sender.fromLocal,
    replyTo: sender.replyTo,
    subject: `[Test] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    unsubscribeUrl: null,
    meta: { org_id: ctx.orgId, kind: 'marketing_test' }
  })
  return { to: user.email, lang: rendered.lang }
})
