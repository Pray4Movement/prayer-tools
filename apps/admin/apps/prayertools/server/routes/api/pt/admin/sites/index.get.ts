// Operator view: search every site, with status, owners and people.
import { requireOperatorAdmin } from '#tenant/server'
import { sql } from 'kysely'

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  const q = String(getQuery(event).q ?? '').trim()
  const rows = await ptAdminDb().selectFrom('orgs as o')
    .innerJoin('pt_site as s', 's.org_id', 'o.id')
    .select([
      'o.id', 'o.slug', 'o.name', 'o.created_at', 'o.suspended_at', 's.status', 's.languages',
      sql<string[]>`coalesce((select array_agg(u.email) from memberships m join users u on u.id = m.user_id where m.org_id = o.id and 'admin' = any(m.roles)), '{}')`.as('owners'),
      sql<number>`(select count(*)::int from pt_subscription p where p.org_id = o.id and p.status = 'active')`.as('active_subscriptions')
    ])
    .$if(!!q, qb => qb.where(eb => eb.or([eb('o.name', 'ilike', `%${q}%`), eb('o.slug', 'ilike', `%${q}%`)])))
    .orderBy('o.created_at', 'desc')
    .limit(200)
    .execute()
  return { sites: rows }
})
