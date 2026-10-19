// Deletes a library that no site uses and that isn't shared with everyone.
import { db } from '#core/server/utils/database'
import { sql } from 'kysely'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { lib } = await ptEditableLibrary(event, id)
  if (lib.visibility === 'published') ptBadRequest('Shared libraries can\'t be deleted; ask Prayer.Tools to withdraw it.')
  const used = await sql<{ n: number }>`select count(*)::int as n from pt_site_library where library_id = ${id}`.execute(ptAdminDb())
  if ((used.rows[0]?.n ?? 0) > 0) ptBadRequest('A site uses this library; remove it from those campaigns first.')
  await db.deleteFrom('pt_library').where('id', '=', id).execute()
  return { ok: true }
})
