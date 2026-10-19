// Sites that opted in to the directory and were approved by an operator.
import { useDb } from '../../utils/db'
import { setCache } from '../../utils/request'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const search = typeof q.q === 'string' ? q.q.trim().slice(0, 100) : ''
  const lang = typeof q.language === 'string' ? q.language.slice(0, 10) : ''
  const perPage = Math.min(50, Math.max(1, Number(q.per_page) || 20))
  const page = Math.max(1, Number(q.page) || 1)
  let query = useDb().selectFrom('pt_directory_entry').where('status', '=', 'listed')
  if (search) query = query.where(eb => eb.or([eb('name', 'ilike', `%${search.replace(/[%_\\]/g, '\\$&')}%`), eb('description', 'ilike', `%${search.replace(/[%_\\]/g, '\\$&')}%`)]))
  if (lang) query = query.where(eb => eb(eb.val(lang), '=', eb.fn.any('languages')))
  const total = await query.select(eb => eb.fn.countAll<string>().as('n')).executeTakeFirst()
  const rows = await query
    .select(['slug', 'name', 'description', 'languages', 'image_url', 'people_count', 'campaign_name', 'campaign_starts_on'])
    .orderBy('people_count', 'desc')
    .orderBy('name')
    .limit(perPage)
    .offset((page - 1) * perPage)
    .execute()
  setCache(event, 'public, max-age=60, s-maxage=300')
  return { page, per_page: perPage, total: Number(total?.n ?? 0), sites: rows }
})
