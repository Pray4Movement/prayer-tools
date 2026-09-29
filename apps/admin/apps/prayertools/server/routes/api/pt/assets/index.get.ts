// The champion's personal image library, usable on any of their sites.
import { db } from '#core/server/utils/database'

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  const assets = await db.selectFrom('pt_personal_asset').selectAll().where('owner_user_id', '=', user.userId).orderBy('created_at', 'desc').limit(500).execute()
  return { assets }
})
