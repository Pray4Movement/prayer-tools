// Reusable content blocks in the champion's personal library.
import { withUserContext } from '#core/server/utils/personal-apps'
import { PT_LIBRARY_APP } from '@prayertools/shared/site'

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  return { blocks: await withUserContext(event, { appId: PT_LIBRARY_APP }, tx => ptTx(tx).selectFrom('pt_personal_block').selectAll().where('owner_user_id', '=', user.userId).orderBy('name').execute()) }
})
