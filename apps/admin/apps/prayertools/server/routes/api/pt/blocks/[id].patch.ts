import { withUserContext } from '#core/server/utils/personal-apps'
import { PT_LIBRARY_APP } from '@prayertools/shared/site'
import { jsonb } from '@prayertools/shared/db/json'

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  const b = await ptBody(event)
  const patch: Record<string, unknown> = { updated_at: new Date() }
  if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim().slice(0, 120)
  if ('content' in b) {
    const doc = ptDoc(b.content)
    if (!doc) ptBadRequest('Invalid content.')
    patch.content = jsonb(doc)
  }
  await withUserContext(event, { appId: PT_LIBRARY_APP }, tx => ptTx(tx).updateTable('pt_personal_block').set(patch as never).where('id', '=', getRouterParam(event, 'id')!).where('owner_user_id', '=', user.userId).execute())
  return { ok: true }
})
