// The champion's personal image library, usable on any of their sites.
import { withUserContext } from '#core/server/utils/personal-apps'
import { PT_LIBRARY_APP } from '@prayertools/shared/site'

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  const assets = await withUserContext(event, { appId: PT_LIBRARY_APP }, tx => ptTx(tx).selectFrom('pt_personal_asset').selectAll().where('owner_user_id', '=', user.userId).orderBy('created_at', 'desc').limit(500).execute())
  return { assets }
})
