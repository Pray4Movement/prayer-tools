// A site's own consent option (e.g. "Send me news about our church's
// mission trips"), offered unchecked at signup. Stored in the CRM consent
// state as purpose `custom:<key>`.
import { parseText, textIn } from '@prayertools/shared/translatable'
import { jsonb } from '@prayertools/shared/db/json'

export default definePtHandler('pt.site.write', async (event, tx) => {
  const b = await ptBody(event)
  const site = await ptSite(tx)
  const label = parseText(b.label)
  if (!label || !textIn(label, site.default_language).trim()) ptBadRequest('Write the wording people will see.')
  const count = await tx.selectFrom('pt_consent_option').select(eb => eb.fn.countAll<string>().as('n')).executeTakeFirst()
  if (Number(count?.n ?? 0) >= 5) ptBadRequest('A site can add up to five consent options.')
  const key = textIn(label, site.default_language).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || `option_${Date.now() % 100000}`
  const exists = await tx.selectFrom('pt_consent_option').select('id').where('key', '=', key).executeTakeFirst()
  const max = await tx.selectFrom('pt_consent_option').select(eb => eb.fn.max('position').as('max')).executeTakeFirst()
  const row = await tx.insertInto('pt_consent_option').values({
    key: exists ? `${key}_${Date.now() % 1000}` : key, label: jsonb(label), position: Number(max?.max ?? -1) + 1
  } as never).returningAll().executeTakeFirstOrThrow()
  return { option: row }
})
