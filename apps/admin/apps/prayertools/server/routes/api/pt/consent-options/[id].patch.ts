// Edits a consent option's wording or turns it off. Past grants keep the
// wording that was shown at the time (copied into the consent log).
import { parseText } from '@prayertools/shared/translatable'
import { jsonb } from '@prayertools/shared/db/json'

export default definePtHandler('pt.content.translate', async (event, tx, ctx) => {
  const id = getRouterParam(event, 'id')!
  const b = await ptBody(event)
  const patch: Record<string, unknown> = {}
  if ('label' in b) {
    const label = parseText(b.label)
    if (!label) ptBadRequest('Invalid wording.')
    patch.label = jsonb(label)
  }
  if ('active' in b) {
    ptNeed(ctx, 'pt.site.write')
    patch.active = b.active === true
  }
  if (Object.keys(patch).length) await tx.updateTable('pt_consent_option').set(patch as never).where('id', '=', id).execute()
  return { ok: true }
})
