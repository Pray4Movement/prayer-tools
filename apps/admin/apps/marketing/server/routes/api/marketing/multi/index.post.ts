import { jsonb, textArray, uuidArray } from '../../../../../lib/db'

export default defineMarketingUserHandler(async (event, tx, userId) => {
  const b = await marketingBody(event)
  const sites = await marketingRequireSites(userId, b.org_ids)
  const { languages } = await marketingSitesLanguages(sites.map(s => s.id))
  const input = marketingDraftInput(b, languages.map(l => l.code))
  const row = await tx
    .insertInto('marketing_parent')
    .values({
      owner_user_id: userId,
      versions: jsonb(input.versions),
      source_language: input.sourceLanguage,
      org_ids: uuidArray(sites.map(s => s.id)),
      audiences: textArray(input.audiences)
    })
    .returning('id')
    .executeTakeFirstOrThrow()
  return { id: row.id }
})
