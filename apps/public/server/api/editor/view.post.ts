// The page view with the admin editor's unsaved landing page, for its preview frame.
import { buildSiteResponse } from '../../utils/views'
import { parseLandingDraft } from '../../utils/editor'
import { siteContext } from '../../utils/site-context'
import { PRIVATE_CACHE, setCache } from '../../utils/request'

export default defineEventHandler(async (event) => {
  const ctx = siteContext(event)
  if (!ctx.editor) throw createError({ statusCode: 403, statusMessage: 'Editor link expired' })
  const body = await readBody<{ path?: unknown }>(event)
  const path = typeof body?.path === 'string' && body.path.startsWith('/') && !body.path.startsWith('//') ? body.path : '/'
  setCache(event, PRIVATE_CACHE)
  return await buildSiteResponse(event, ctx, path, parseLandingDraft(body))
})
