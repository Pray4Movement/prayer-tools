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
