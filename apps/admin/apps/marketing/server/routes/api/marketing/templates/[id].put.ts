import { jsonb } from '../../../../../lib/db'
import { parseVersions } from '../../../../../lib/render'

export default defineMarketingUserHandler(async (event, tx, userId) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const b = await marketingBody(event)
  const patch: Record<string, unknown> = { updated_at: new Date() }
  if (b.name !== undefined) {
    const name = String(b.name).trim().slice(0, 120)
    if (!name) marketingBadRequest('Give the template a name.')
    patch.name = name
  }
  if (b.versions !== undefined) {
    const versions = parseVersions(b.versions)
    const sourceLanguage = String(b.source_language ?? '')
    if (!versions[sourceLanguage]) marketingBadRequest('The template needs its source language version.')
    patch.versions = jsonb(versions)
    patch.source_language = sourceLanguage
  }
  const res = await tx.updateTable('marketing_template').set(patch).where('id', '=', id).where('owner_user_id', '=', userId).executeTakeFirst()
  if (!Number(res.numUpdatedRows)) marketingNotFound('Template not found.')
  return { ok: true }
})
