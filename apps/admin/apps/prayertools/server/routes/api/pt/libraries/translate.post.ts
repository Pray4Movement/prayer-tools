// AI translation for library editing (outside any site): uses the host's AI key.
import { db } from '#core/server/utils/database'

export default defineEventHandler(async (event) => {
  await ptUser(event)
  const body = await ptBody(event)
  return await db.transaction().execute(tx => ptTranslate(tx, body))
})
