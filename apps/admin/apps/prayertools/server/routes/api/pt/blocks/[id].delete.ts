import { withUserContext } from '#core/server/utils/personal-apps'
import { PT_LIBRARY_APP } from '@prayertools/shared/site'

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  await withUserContext(event, { appId: PT_LIBRARY_APP }, tx => ptTx(tx).deleteFrom('pt_personal_block').where('id', '=', getRouterParam(event, 'id')!).where('owner_user_id', '=', user.userId).execute())
  return { ok: true }
})
