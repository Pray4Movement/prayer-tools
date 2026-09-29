// Saves a draft entry. Drafts reach sites only when the library is published.
import { db } from '#core/server/utils/database'
import { isLanguage } from '@prayertools/shared/languages'
import { jsonb } from '@prayertools/shared/db/json'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const day = Number(getRouterParam(event, 'day'))
  const lang = getRouterParam(event, 'lang')!
  await ptEditableLibrary(event, id)
  if (!Number.isInteger(day) || day < 1 || day > 3650) ptBadRequest('Invalid day.')
  if (!isLanguage(lang)) ptBadRequest('Unknown language.')
  const { doc } = await ptBody<{ doc?: unknown }>(event)
  const d = ptDoc(doc)
  if (!d) ptBadRequest('Invalid content.')
  await db.insertInto('pt_library_entry').values({ library_id: id, day, language: lang, draft: jsonb(d), updated_at: new Date() } as never)
    .onConflict(oc => oc.columns(['library_id', 'day', 'language']).doUpdateSet({ draft: jsonb(d) as never, updated_at: new Date() }))
    .execute()
  await db.updateTable('pt_library').set({ updated_at: new Date() }).where('id', '=', id).execute()
  return { ok: true }
})
