// A short-lived editor token for the landing page editor's preview frame, so
// the site shows drafts and unsaved changes there.
import { editorToken } from '@prayertools/shared/links'

export default definePtHandler(null, async (_event, _tx, ctx) => {
  if (!ctx.perms.has('pt.site.write' as never) && !ctx.perms.has('pt.content.translate' as never)) {
    throw createError({ statusCode: 403, statusMessage: 'Permission required: pt.site.write' })
  }
  return { token: editorToken(ctx.orgId) }
})
