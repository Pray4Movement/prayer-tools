import { jsonb, textArray, uuidArray } from '../../../../../lib/db'

export default defineMarketingUserHandler(async (event, tx, userId) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const b = await marketingBody(event)
  const sites = await marketingRequireSites(userId, b.org_ids)
  const { languages } = await marketingSitesLanguages(sites.map(s => s.id))
  const input = marketingDraftInput(b, languages.map(l => l.code))
  const res = await tx
    .updateTable('marketing_parent')
    .set({
      versions: jsonb(input.versions),
      source_language: input.sourceLanguage,
      org_ids: uuidArray(sites.map(s => s.id)),
      audiences: textArray(input.audiences),
      updated_at: new Date()
    })
    .where('id', '=', id)
    .where('owner_user_id', '=', userId)
    .where('status', '=', 'draft')
    .executeTakeFirst()
  if (!Number(res.numUpdatedRows)) throw createError({ statusCode: 409, statusMessage: 'Only drafts can be edited.' })
  return { ok: true }
})
