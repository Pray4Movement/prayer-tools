// Removes an image from the library. Sites that already use its URL keep
// showing it; the stored file stays.
import { db } from '#core/server/utils/database'

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  await db.deleteFrom('pt_personal_asset').where('id', '=', getRouterParam(event, 'id')!).where('owner_user_id', '=', user.userId).execute()
  return { ok: true }
})
