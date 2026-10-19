// Edits an image's alt text, credit and focal point (so the top image crops
// well on phones).
import { withUserContext } from '#core/server/utils/personal-apps'
import { PT_LIBRARY_APP } from '@prayertools/shared/site'
import { parseText } from '@prayertools/shared/translatable'
import { jsonb } from '@prayertools/shared/db/json'

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  const id = getRouterParam(event, 'id')!
  const b = await ptBody(event)
  const patch: Record<string, unknown> = {}
  if ('alt' in b) {
    const alt = parseText(b.alt)
    if (!alt) ptBadRequest('Invalid alt text.')
    patch.alt = jsonb(alt)
  }
  if ('credit' in b) patch.credit = typeof b.credit === 'string' ? b.credit.slice(0, 200) : null
  for (const k of ['focal_x', 'focal_y'] as const) {
    if (k in b) {
      const v = Number(b[k])
      if (!(v >= 0 && v <= 1)) ptBadRequest('Focal point must be between 0 and 1.')
      patch[k] = v
    }
  }
  const res = await withUserContext(event, { appId: PT_LIBRARY_APP }, tx => ptTx(tx).updateTable('pt_personal_asset').set(patch as never).where('id', '=', id).where('owner_user_id', '=', user.userId).executeTakeFirst())
  if (!Number(res.numUpdatedRows)) ptNotFound('Image not found.')
  return { ok: true }
})
