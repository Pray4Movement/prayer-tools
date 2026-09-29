// Universal links for the app: served on *.<base> and the go host only (the
// host middleware refuses custom domains). 404 until configured.
import { setCache } from '../../utils/request'

export default defineEventHandler((event) => {
  const ids = (process.env.PT_APPLE_APP_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!ids.length) throw createError({ statusCode: 404 })
  setResponseHeader(event, 'content-type', 'application/json')
  setCache(event, 'public, max-age=3600, s-maxage=86400')
  return {
    applinks: { details: [{ appIDs: ids, components: [{ '/': '/*' }, { '/': '/m/*', 'exclude': true }, { '/': '/u/*', 'exclude': true }, { '/': '/verify/*', 'exclude': true }] }] },
    webcredentials: { apps: ids }
  }
})
