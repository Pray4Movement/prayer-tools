import type { SiteContext } from '../utils/site-context'
import { setCache } from '../utils/request'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  const site = event.context.site as SiteContext | undefined
  if (!site || site.status === 'draft' || site.preview) {
    setCache(event, 'public, max-age=3600')
    return 'User-agent: *\nDisallow: /\n'
  }
  setCache(event, 'public, max-age=3600, s-maxage=86400')
  return ['User-agent: *', 'Disallow: /api/', 'Disallow: /manage', 'Disallow: /m/', 'Disallow: /u/', 'Disallow: /verify/', 'Disallow: /checkin/', 'Disallow: /ics/', 'Disallow: /preview/', 'Disallow: /embed', ''].join('\n')
})
