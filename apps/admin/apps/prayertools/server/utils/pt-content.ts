import type { Transaction } from 'kysely'
import type { Database } from '#core/server/database/schema'
import { jsonb } from '@prayertools/shared/db/json'

type Tx = Transaction<Database>

export async function ptSiteLibrary(tx: Tx, id: string) {
  const sl = await tx.selectFrom('pt_site_library').selectAll().where('id', '=', id).executeTakeFirst()
  if (!sl) ptNotFound('Library not found on this site.')
  return sl
}

// The first edit of a followed library gives the site its own copy, frozen
// at the version it was on. From then on library updates never change it.
export async function ptFreezeCopy(tx: Tx, siteLibraryId: string): Promise<void> {
  const sl = await ptSiteLibrary(tx, siteLibraryId)
  if (!sl.library_id || sl.frozen_version !== null) return
  const lib = await tx.selectFrom('pt_library').select(['published_version']).where('id', '=', sl.library_id).executeTakeFirst()
  const entries = await tx.selectFrom('pt_library_entry').select(['day', 'language', 'published']).where('library_id', '=', sl.library_id).where('published', 'is not', null).execute()
  for (const e of entries) {
    await tx.insertInto('pt_site_entry').values({ site_library_id: siteLibraryId, day: e.day, language: e.language, content: jsonb(e.published), edited: false } as never)
      .onConflict(oc => oc.columns(['site_library_id', 'day', 'language']).doNothing()).execute()
  }
  await tx.updateTable('pt_site_library').set({ frozen_version: lib?.published_version ?? 0 }).where('id', '=', siteLibraryId).execute()
}

// Replaces the site's copy with the library's latest published version,
// discarding the site's edits to that library.
export async function ptTakeLibraryUpdate(tx: Tx, siteLibraryId: string): Promise<void> {
  const sl = await ptSiteLibrary(tx, siteLibraryId)
  if (!sl.library_id) ptBadRequest('This content was written for the site; there is no library to update from.')
  await tx.deleteFrom('pt_site_entry').where('site_library_id', '=', siteLibraryId).execute()
  await tx.updateTable('pt_site_library').set({ frozen_version: null }).where('id', '=', siteLibraryId).execute()
}

export async function ptLibraryReadable(tx: Tx, libraryId: string, userId: string) {
  const lib = await tx.selectFrom('pt_library').selectAll().where('id', '=', libraryId).executeTakeFirst()
  if (!lib) ptNotFound('Library not found.')
  if (lib.visibility !== 'published' && lib.owner_user_id !== userId) ptNotFound('Library not found.')
  return lib
}

// A campaign's stacked libraries with entry counts and language coverage.
export async function ptCampaignLibraries(tx: Tx, campaignId: string, languages: string[]) {
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
      missingLanguages: languages.filter(l => (coverage[l] ?? 0) < entryCount),
      staleCount
    })
  }
  return libraries
}
