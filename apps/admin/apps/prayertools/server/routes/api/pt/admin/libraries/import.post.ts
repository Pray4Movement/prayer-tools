// Imports a content pack as a platform library. Body: { title, cadence,
// source_language, license, credit?, topics?, template_keys?, entries: [{ day,
// language, doc? | html? | text? }] }. HTML (e.g. WordPress prayer fuel
// exports) becomes paragraphs and headings.
import { requireOperatorAdmin } from '#tenant/server'
import { jsonb } from '@prayertools/shared/db/json'
import { isLanguage } from '@prayertools/shared/languages'
import { textDoc } from '@prayertools/shared/tiptap'
import type { TiptapDoc, TiptapNode } from '@prayertools/shared/db/schema'

function htmlToDoc(html: string): TiptapDoc {
  const blocks: TiptapNode[] = []
  const decode = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, '\'').trim()
  const re = /<(h[1-6]|p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const text = decode(m[2]!)
    if (!text) continue
    const tag = m[1]!.toLowerCase()
    if (tag.startsWith('h')) blocks.push({ type: 'heading', attrs: { level: Math.min(4, Number(tag[1])) }, content: [{ type: 'text', text }] })
    else if (tag === 'blockquote') blocks.push({ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
    else blocks.push({ type: 'paragraph', content: [{ type: 'text', text: tag === 'li' ? `• ${text}` : text }] })
  }
  return blocks.length ? { type: 'doc', content: blocks } : textDoc(decode(html))
}

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  const b = await ptBody(event)
  const meta = ptLibraryMeta(b)
  const entries = Array.isArray(b.entries) ? (b.entries as Record<string, unknown>[]) : []
  if (!entries.length || entries.length > 20_000) ptBadRequest('No entries to import.')
  const db = ptAdminDb()
  const lib = await db.insertInto('pt_library').values({ ...meta, owner_user_id: null, visibility: 'published' } as never).returning('id').executeTakeFirstOrThrow()
  let count = 0
  for (const e of entries) {
    const day = Number(e.day)
    const lang = String(e.language ?? '')
    if (!Number.isInteger(day) || day < 1 || !isLanguage(lang)) continue
    const doc = e.doc ? ptDoc(e.doc) : typeof e.html === 'string' ? htmlToDoc(e.html) : typeof e.text === 'string' ? textDoc(e.text) : null
    if (!doc) continue
    await db.insertInto('pt_library_entry').values({ library_id: lib.id, day, language: lang, draft: jsonb(doc), published: null } as never)
      .onConflict(oc => oc.columns(['library_id', 'day', 'language']).doUpdateSet({ draft: jsonb(doc) as never })).execute()
    count++
  }
  await ptPublishLibrary(lib.id)
  return { id: lib.id, imported: count }
})
