// Removes a draft entry that was never published. Published entries stay:
// sites may be following them.
import { db } from '#core/server/utils/database'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await ptEditableLibrary(event, id)
  const res = await db.deleteFrom('pt_library_entry')
    .where('library_id', '=', id).where('day', '=', Number(getRouterParam(event, 'day'))).where('language', '=', getRouterParam(event, 'lang')!)
    .where('published', 'is', null).executeTakeFirst()
  if (!Number(res.numDeletedRows)) ptBadRequest('Published entries can\'t be deleted.')
  return { ok: true }
})
