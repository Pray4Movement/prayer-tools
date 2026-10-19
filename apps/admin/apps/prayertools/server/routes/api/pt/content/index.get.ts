// A campaign's content: its stacked libraries with language coverage, and
// whether a followed library's copy has a newer published version.
export default definePtHandler('pt.site.read', async (event, tx) => {
  const campaignId = String(getQuery(event).campaign ?? '')
  const site = await ptSite(tx)
  if (!/^[0-9a-f-]{36}$/.test(campaignId)) return { libraries: [], languages: site.languages, defaultLanguage: site.default_language }
  const rows = await tx
    .selectFrom('pt_campaign_library as cl')
    .innerJoin('pt_site_library as sl', 'sl.id', 'cl.site_library_id')
    .leftJoin('pt_library as l', 'l.id', 'sl.library_id')
    .select([
      'cl.position', 'sl.id', 'sl.title', 'sl.cadence', 'sl.library_id', 'sl.frozen_version',
      'l.title as library_title', 'l.published_version', 'l.credit', 'l.license', 'l.entry_count', 'l.languages as library_languages', 'l.owner_user_id'
    ])
    .where('cl.campaign_id', '=', campaignId)
    .orderBy('cl.position')
    .execute()
  const libraries = []
  for (const r of rows) {
    const follows = !!r.library_id && r.frozen_version === null
    let coverage: Record<string, number> = {}
    let entryCount = Number(r.entry_count ?? 0)
    let staleCount = 0
    if (follows) {
      const counts = await tx.selectFrom('pt_library_entry').select(['language', eb => eb.fn.countAll<string>().as('n')])
        .where('library_id', '=', r.library_id!).where('published', 'is not', null).groupBy('language').execute()
      coverage = Object.fromEntries(counts.map(c => [c.language, Number(c.n)]))
    } else {
      const counts = await tx.selectFrom('pt_site_entry').select(['language', eb => eb.fn.countAll<string>().as('n'), eb => eb.fn.max('day').as('max')])
        .where('site_library_id', '=', r.id).groupBy('language').execute()
      coverage = Object.fromEntries(counts.map(c => [c.language, Number(c.n)]))
      entryCount = Math.max(0, ...counts.map(c => Number(c.max ?? 0)))
      const stale = await tx.selectFrom('pt_site_entry').select(eb => eb.fn.countAll<string>().as('n')).where('site_library_id', '=', r.id).where('stale', '=', true).executeTakeFirst()
      staleCount = Number(stale?.n ?? 0)
    }
    libraries.push({
      siteLibraryId: r.id,
      title: r.title,
      cadence: r.cadence,
      libraryId: r.library_id,
      follows,
      frozenVersion: r.frozen_version,
      latestVersion: r.published_version ?? null,
      updateAvailable: !!r.library_id && r.frozen_version !== null && (r.published_version ?? 0) > r.frozen_version,
      credit: r.credit,
      license: r.license,
      entryCount,
      coverage,
      missingLanguages: site.languages.filter(l => (coverage[l] ?? 0) < entryCount),
      staleCount
    })
  }
  return { libraries, languages: site.languages, defaultLanguage: site.default_language }
})
