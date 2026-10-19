import { withUserContext } from '#core/server/utils/personal-apps'
import { PT_LIBRARY_APP } from '@prayertools/shared/site'
import { jsonb } from '@prayertools/shared/db/json'

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  const b = await ptBody(event)
  const name = String(b.name ?? '').trim().slice(0, 120)
  const doc = ptDoc(b.content)
  if (!name || !doc) ptBadRequest('Give the block a name and some content.')
  const row = await withUserContext(event, { appId: PT_LIBRARY_APP }, tx => ptTx(tx).insertInto('pt_personal_block').values({ owner_user_id: user.userId, name, content: jsonb(doc) } as never).returningAll().executeTakeFirstOrThrow())
  return { block: row }
})
