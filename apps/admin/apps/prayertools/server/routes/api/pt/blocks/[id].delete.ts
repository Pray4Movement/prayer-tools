import { db } from '#core/server/utils/database'

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  await db.deleteFrom('pt_personal_block').where('id', '=', getRouterParam(event, 'id')!).where('owner_user_id', '=', user.userId).execute()
  return { ok: true }
})
