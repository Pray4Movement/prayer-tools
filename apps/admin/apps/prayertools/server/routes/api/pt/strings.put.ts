import { EDITABLE_SITE_STRINGS } from '@prayertools/shared/site-strings'

// Sets (or, with an empty value, removes) the site's wording for one string
// in one language. Only explicit overrides are stored.
export default definePtHandler('pt.content.translate', async (event, tx, ctx) => {
  const b = await ptBody<{ key?: string, language?: string, value?: string }>(event)
  const site = await ptSite(tx)
  const key = String(b.key ?? '')
  const lang = String(b.language ?? '')
  if (!(EDITABLE_SITE_STRINGS as readonly string[]).includes(key)) ptBadRequest('This text can\'t be changed.')
  if (!site.languages.includes(lang)) ptBadRequest('Not a site language.')
  if (lang === site.default_language) ptNeed(ctx, 'pt.site.write')
  const value = String(b.value ?? '').trim().slice(0, 2000)
  if (!value) {
    await tx.deleteFrom('pt_site_string').where('key', '=', key).where('language', '=', lang).execute()
  } else {
    await tx.insertInto('pt_site_string').values({ key, language: lang, value, updated_at: new Date() } as never)
      .onConflict(oc => oc.columns(['org_id', 'key', 'language']).doUpdateSet({ value, updated_at: new Date() })).execute()
  }
  return { ok: true }
})
