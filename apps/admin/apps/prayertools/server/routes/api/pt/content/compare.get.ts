// The site's copy of an entry next to the library's latest published version.
export default definePtHandler('pt.site.read', async (event, tx) => {
  const q = getQuery(event)
  const sl = await ptSiteLibrary(tx, String(q.siteLibrary ?? ''))
  if (!sl.library_id) ptBadRequest('No library to compare with.')
  const day = Number(q.day)
  const lang = String(q.lang ?? '')
  const site = await tx.selectFrom('pt_site_entry').select(['content', 'edited']).where('site_library_id', '=', sl.id).where('day', '=', day).where('language', '=', lang).executeTakeFirst()
  const lib = await tx.selectFrom('pt_library_entry').select(['published']).where('library_id', '=', sl.library_id).where('day', '=', day).where('language', '=', lang).executeTakeFirst()
  return { site: site?.content ?? null, edited: site?.edited ?? false, library: lib?.published ?? null }
})
