// What the Share screen needs: the live address (custom domain once active),
// QR codes (PNG data URL and SVG), and the share messages per language.
import QRCode from 'qrcode'
import { siteUrlFor } from '@prayertools/shared/site'
import { platformConfig } from '@prayertools/shared/config'

export default definePtHandler('pt.site.read', async (_event, tx, ctx) => {
  const site = await ptSite(tx)
  const url = await siteUrlFor(ptTx(tx), ctx.orgId, ctx.orgSlug)
  const [png, svg] = await Promise.all([
    QRCode.toDataURL(url, { width: 1024, margin: 2 }),
    QRCode.toString(url, { type: 'svg', margin: 2 })
  ])
  return { url, qrPng: png, qrSvg: svg, share: site.share, languages: site.languages, defaultLanguage: site.default_language, donateUrl: platformConfig().donateUrl }
})
