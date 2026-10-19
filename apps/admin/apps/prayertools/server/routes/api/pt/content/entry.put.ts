// Saves an entry. Editors edit any language; translators every language but
// the site's default. The first edit of a followed library freezes the
// site's copy. Editing the default language flags that day's other
// languages as out of date instead of overwriting them.
import { jsonb } from '@prayertools/shared/db/json'

export default definePtHandler(null, async (event, tx, ctx) => {
  const b = await ptBody<{ siteLibraryId?: string, day?: number, lang?: string, doc?: unknown, followsEdit?: boolean }>(event)
  const site = await ptSite(tx)
  const lang = String(b.lang ?? '')
  const day = Number(b.day)
  if (!site.languages.includes(lang)) ptBadRequest('Not a site language.')
  if (!Number.isInteger(day) || day < 1 || day > 3650) ptBadRequest('Invalid day.')
  const isSource = lang === site.default_language
  ptNeed(ctx, isSource ? 'pt.content.write' : 'pt.content.translate')
  const doc = ptDoc(b.doc)
  if (!doc) ptBadRequest('Invalid content.')
  const siteLibraryId = String(b.siteLibraryId ?? '')
  await ptFreezeCopy(tx, siteLibraryId)
  const now = new Date()
  await tx.insertInto('pt_site_entry')
    .values({ site_library_id: siteLibraryId, day, language: lang, content: jsonb(doc), edited: true, stale: false, updated_at: now } as never)
    .onConflict(oc => oc.columns(['site_library_id', 'day', 'language']).doUpdateSet({ content: jsonb(doc) as never, edited: true, stale: false, updated_at: now }))
    .execute()
  if (isSource) {
    await tx.updateTable('pt_site_entry').set({ stale: true }).where('site_library_id', '=', siteLibraryId).where('day', '=', day).where('language', '!=', lang).execute()
  }
  return { ok: true }
})
