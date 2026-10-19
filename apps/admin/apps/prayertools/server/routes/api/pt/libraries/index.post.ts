// A new library owned by the caller, or a platform library (operators).
import { db } from '#core/server/utils/database'

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  const b = await ptBody(event)
  const meta = ptLibraryMeta(b)
  const platform = b.platform === true
  if (platform && !user.isAdmin) throw createError({ statusCode: 403, statusMessage: 'Only operators create platform libraries.' })
  const row = await db.insertInto('pt_library').values({
    ...meta,
    owner_user_id: platform ? null : user.userId,
    visibility: platform ? 'published' : 'private'
  } as never).returning('id').executeTakeFirstOrThrow()
  return { id: row.id }
})
