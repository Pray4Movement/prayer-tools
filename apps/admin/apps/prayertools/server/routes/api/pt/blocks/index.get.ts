// Reusable content blocks in the champion's personal library.
import { db } from '#core/server/utils/database'

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  return { blocks: await db.selectFrom('pt_personal_block').selectAll().where('owner_user_id', '=', user.userId).orderBy('name').execute() }
})
