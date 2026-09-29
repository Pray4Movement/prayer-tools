// QR code for the site's go link (opens the app when installed, else the site).
import QRCode from 'qrcode'
import { goOrigin } from '@prayertools/shared/config'
import { siteContext } from '../utils/site-context'
import { setCache } from '../utils/request'

export default defineEventHandler(async (event) => {
  const ctx = siteContext(event)
  const svg = await QRCode.toString(`${goOrigin()}/${ctx.slug}`, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
  setResponseHeader(event, 'content-type', 'image/svg+xml')
  setCache(event, 'public, max-age=86400, s-maxage=86400')
  return svg
})
