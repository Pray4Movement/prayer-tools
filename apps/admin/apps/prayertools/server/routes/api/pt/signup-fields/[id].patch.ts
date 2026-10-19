// Edits a signup question's labels (any language), options, required flag
// and position. The kind and key stay fixed once people have answered.
import { parseText } from '@prayertools/shared/translatable'
import { jsonb } from '@prayertools/shared/db/json'

export default definePtHandler('pt.content.translate', async (event, tx, ctx) => {
  const id = getRouterParam(event, 'id')!
  const b = await ptBody(event)
  const field = await tx.selectFrom('pt_signup_field').selectAll().where('id', '=', id).executeTakeFirst()
  if (!field) ptNotFound('Question not found.')
  const patch: Record<string, unknown> = {}
  if ('label' in b) {
    const label = parseText(b.label)
    if (!label) ptBadRequest('Invalid label.')
    patch.label = jsonb(label)
  }
  if ('options' in b && field.kind === 'select') patch.options = jsonb(ptFieldOptions(b.options))
  const structural = 'required' in b || 'position' in b
  if (structural) {
    ptNeed(ctx, 'pt.site.write')
    if ('required' in b) patch.required = b.required === true
    if (Number.isInteger(b.position)) patch.position = b.position
  }
  if (Object.keys(patch).length) await tx.updateTable('pt_signup_field').set(patch as never).where('id', '=', id).execute()
  return { ok: true }
})
