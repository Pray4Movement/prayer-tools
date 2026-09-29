// Adds a custom signup field (up to 5). The answers live on the CRM contact
// as a custom field `pt_<key>`, so they also show in the CRM.
import { createField } from '#crm/server'
import { parseText, textIn } from '@prayertools/shared/translatable'
import { jsonb } from '@prayertools/shared/db/json'

const CRM_KIND = { text: 'text', select: 'key_select', checkbox: 'boolean' } as const

export default definePtHandler('pt.site.write', async (event, tx, ctx) => {
  const b = await ptBody(event)
  const site = await ptSite(tx)
  const count = await tx.selectFrom('pt_signup_field').select(eb => eb.fn.countAll<string>().as('n')).executeTakeFirst()
  if (Number(count?.n ?? 0) >= 5) ptBadRequest('A site can ask up to five questions at signup.')
  const kind = b.kind as keyof typeof CRM_KIND
  if (!(kind in CRM_KIND)) ptBadRequest('Choose short text, dropdown or checkbox.')
  const label = parseText(b.label)
  if (!label || !textIn(label, site.default_language).trim()) ptBadRequest('Give the question a label.')
  const options = kind === 'select' ? ptFieldOptions(b.options) : []
  if (kind === 'select' && options.length < 2) ptBadRequest('A dropdown needs at least two options.')
  const key = String(b.key ?? textIn(label, site.default_language)).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || `q${Date.now() % 100000}`
  const exists = await tx.selectFrom('pt_signup_field').select('id').where('key', '=', key).executeTakeFirst()
  if (exists) ptBadRequest('A question with this key already exists.')
  await createField(tx, ctx, 'contacts', {
    fieldKey: `pt_${key}`.slice(0, 41),
    kind: CRM_KIND[kind],
    label: textIn(label, site.default_language),
    ...(kind === 'select' ? { options: Object.fromEntries(options.map(o => [o.key, { label: textIn(o.label, site.default_language) }])) } : {})
  } as never).catch((err: { statusMessage?: string }) => ptBadRequest(err.statusMessage ?? 'Could not add the field to the CRM.'))
  const max = await tx.selectFrom('pt_signup_field').select(eb => eb.fn.max('position').as('max')).executeTakeFirst()
  const row = await tx.insertInto('pt_signup_field').values({
    key, kind, label: jsonb(label), options: jsonb(options), required: b.required === true, position: Number(max?.max ?? -1) + 1
  } as never).returningAll().executeTakeFirstOrThrow()
  return { field: row }
})
