// Prayer content for a campaign day. A campaign stacks one or more of the
// site's libraries per day. A site library either follows a shared library
// (entries render from its latest published version, so fixes and new
// translations arrive automatically) or is the site's own copy (frozen on
// first edit, or content written from scratch).
import type { Tx } from './db/scope'
import type { Cadence, TiptapDoc } from './db/schema'

export interface ContentBlock {
  siteLibraryId: string
  title: string
  credit: string | null
  license: string | null
  language: string
  doc: TiptapDoc
}

export interface CampaignLibraryRow {
  siteLibraryId: string
  libraryId: string | null
  title: string
  cadence: Cadence
  frozenVersion: number | null
  credit: string | null
  license: string | null
  entryCount: number
}

export async function campaignLibraries(tx: Tx, campaignId: string): Promise<CampaignLibraryRow[]> {
  const rows = await tx
    .selectFrom('pt_campaign_library as cl')
    .innerJoin('pt_site_library as sl', 'sl.id', 'cl.site_library_id')
    .leftJoin('pt_library as l', 'l.id', 'sl.library_id')
    .select([
      'sl.id as siteLibraryId', 'sl.library_id as libraryId', 'sl.title as title', 'sl.cadence as cadence',
      'sl.frozen_version as frozenVersion', 'l.credit as credit', 'l.license as license', 'l.entry_count as libEntryCount'
    ])
    .where('cl.campaign_id', '=', campaignId)
    .orderBy('cl.position', 'asc')
    .execute()
  const out: CampaignLibraryRow[] = []
  for (const r of rows) {
    let entryCount = Number(r.libEntryCount ?? 0)
    if (!r.libraryId || r.frozenVersion !== null) {
      const c = await tx.selectFrom('pt_site_entry').select(eb => eb.fn.max('day').as('max')).where('site_library_id', '=', r.siteLibraryId).executeTakeFirst()
      entryCount = Number(c?.max ?? 0)
    }
    out.push({ siteLibraryId: r.siteLibraryId, libraryId: r.libraryId, title: r.title, cadence: r.cadence, frozenVersion: r.frozenVersion, credit: r.credit ?? null, license: r.license ?? null, entryCount })
  }
  return out
}

async function libraryEntry(tx: Tx, libraryId: string, day: number, languages: string[]): Promise<{ doc: TiptapDoc, language: string } | null> {
  const rows = await tx
    .selectFrom('pt_library_entry')
    .select(['language', 'published'])
    .where('library_id', '=', libraryId)
    .where('day', '=', day)
    .where('language', 'in', languages)
    .where('published', 'is not', null)
    .execute()
  for (const lang of languages) {
    const hit = rows.find(r => r.language === lang)
    if (hit?.published) return { doc: hit.published as TiptapDoc, language: lang }
  }
  return null
}

async function siteEntry(tx: Tx, siteLibraryId: string, day: number, languages: string[]): Promise<{ doc: TiptapDoc, language: string } | null> {
  const rows = await tx
    .selectFrom('pt_site_entry')
    .select(['language', 'content'])
    .where('site_library_id', '=', siteLibraryId)
    .where('day', '=', day)
    .where('language', 'in', languages)
    .execute()
  for (const lang of languages) {
    const hit = rows.find(r => r.language === lang)
    if (hit) return { doc: hit.content as TiptapDoc, language: lang }
  }
  return null
}

// Content blocks for one entry number, in the wanted language with the
// site's default as fallback.
export async function dayContent(tx: Tx, campaignId: string, day: number, language: string, fallbackLanguage: string): Promise<ContentBlock[]> {
  if (day < 1) return []
  const langs = [...new Set([language, fallbackLanguage])]
  const blocks: ContentBlock[] = []
  for (const lib of await campaignLibraries(tx, campaignId)) {
    const followsLibrary = lib.libraryId && lib.frozenVersion === null
    const hit = followsLibrary
      ? await libraryEntry(tx, lib.libraryId!, day, langs)
      : await siteEntry(tx, lib.siteLibraryId, day, langs)
    if (hit) blocks.push({ siteLibraryId: lib.siteLibraryId, title: lib.title, credit: lib.credit, license: lib.license, language: hit.language, doc: hit.doc })
  }
  return blocks
}

// The number of entries a campaign's content covers (the longest library).
export async function contentLength(tx: Tx, campaignId: string): Promise<number> {
  const libs = await campaignLibraries(tx, campaignId)
  return libs.reduce((max, l) => Math.max(max, l.entryCount), 0)
}

// Placeholder values filled into library text so one library reads naturally
// on many sites.
export function placeholderVars(input: { siteName: string, campaignName: string, place?: string | null, peopleGroup?: string | null, startDate?: string | null, endDate?: string | null }): Record<string, string> {
  return {
    site_name: input.siteName,
    campaign_name: input.campaignName,
    place: input.place || input.siteName,
    people_group: input.peopleGroup || input.place || input.siteName,
    start_date: input.startDate ?? '',
    end_date: input.endDate ?? ''
  }
}

export const LICENSES = ['own', 'permission', 'cc_by', 'cc_by_sa', 'other'] as const
export type License = typeof LICENSES[number]
