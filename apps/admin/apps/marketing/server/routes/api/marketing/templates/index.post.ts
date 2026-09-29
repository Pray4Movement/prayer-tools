import { db } from '#core/server/utils/database'
import { jsonb } from '../../../../../lib/db'
import { parseVersions } from '../../../../../lib/render'

export default defineMarketingUserHandler(async (event, userId) => {
  const b = await marketingBody(event)
  const name = String(b.name ?? '').trim().slice(0, 120)
  if (!name) marketingBadRequest('Give the template a name.')
  const versions = parseVersions(b.versions ?? {})
  const sourceLanguage = String(b.source_language ?? '')
  if (!versions[sourceLanguage]) marketingBadRequest('The template needs its source language version.')
  const row = await db
    .insertInto('marketing_template')
    .values({ owner_user_id: userId, name, versions: jsonb(versions), source_language: sourceLanguage })
    .returning('id')
    .executeTakeFirstOrThrow()
  return { id: row.id }
})
