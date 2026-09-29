// The page view for client-side navigation.
import { applyViewHeaders, buildView } from '../utils/page-view'

export default defineEventHandler(async (event) => {
  const path = String(getQuery(event).path ?? '/')
  if (!path.startsWith('/') || path.startsWith('//')) throw createError({ statusCode: 400 })
  const view = await buildView(event, path)
  applyViewHeaders(event, view)
  return view
})
