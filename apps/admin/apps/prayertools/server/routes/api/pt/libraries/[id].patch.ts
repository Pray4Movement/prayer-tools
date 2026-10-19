import { db } from '#core/server/utils/database'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await ptEditableLibrary(event, id)
  const b = await ptBody(event)
  const meta = ptLibraryMeta(b, true)
  if (Object.keys(meta).length) await db.updateTable('pt_library').set({ ...meta, updated_at: new Date() } as never).where('id', '=', id).execute()
  return { ok: true }
})
