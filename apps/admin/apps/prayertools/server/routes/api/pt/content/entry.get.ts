// One entry (day × language) of a site library, from the library while the
// site follows it, from the site's copy otherwise.
import type { TiptapDoc } from '@prayertools/shared/db/schema'

export default definePtHandler('pt.site.read', async (event, tx) => {
  const q = getQuery(event)
  const sl = await ptSiteLibrary(tx, String(q.siteLibrary ?? ''))
  const day = Number(q.day)
  const lang = String(q.lang ?? '')
  if (!Number.isInteger(day) || day < 1) ptBadRequest('Invalid day.')
  const follows = !!sl.library_id && sl.frozen_version === null
  if (follows) {
    const rows = await tx.selectFrom('pt_library_entry').select(['language', 'published']).where('library_id', '=', sl.library_id!).where('day', '=', day).where('published', 'is not', null).execute()
    const hit = rows.find(r => r.language === lang)
    return { source: 'library', doc: (hit?.published ?? null) as TiptapDoc | null, stale: false, edited: false, languages: rows.map(r => r.language) }
  }
  const rows = await tx.selectFrom('pt_site_entry').select(['language', 'content', 'stale', 'edited']).where('site_library_id', '=', sl.id).where('day', '=', day).execute()
  const hit = rows.find(r => r.language === lang)
  return { source: 'site', doc: (hit?.content ?? null) as TiptapDoc | null, stale: hit?.stale ?? false, edited: hit?.edited ?? false, languages: rows.map(r => r.language) }
})
