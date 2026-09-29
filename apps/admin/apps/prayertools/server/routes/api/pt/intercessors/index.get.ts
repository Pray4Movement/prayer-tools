// The site's intercessors: CRM contacts with their subscription. Anonymous
// app intercessors appear only as counts.
import { sql } from 'kysely'

export default definePtHandler('pt.intercessors.read', async (event, tx) => {
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = Math.min(100, Math.max(10, Number(q.perPage) || 50))
  let base = tx.selectFrom('pt_subscription as s')
    .innerJoin('crm_records as r', 'r.id', 's.contact_id')
    .where('s.anonymized_at', 'is', null)
  if (typeof q.status === 'string' && ['active', 'inactive', 'completed', 'unsubscribed'].includes(q.status)) base = base.where('s.status', '=', q.status as never)
  if (q.verified === 'no') base = base.where('s.verified_at', 'is', null)
  if (q.verified === 'yes') base = base.where('s.verified_at', 'is not', null)
  if (typeof q.campaign === 'string' && q.campaign) {
    base = base.where(eb => eb.exists(eb.selectFrom('pt_commitment as c').select('c.id').whereRef('c.subscription_id', '=', 's.id').where('c.campaign_id', '=', q.campaign as string)))
  }
  if (typeof q.q === 'string' && q.q.trim()) {
    const term = `%${q.q.trim()}%`
    base = base.where(eb => eb.or([
      eb('r.name', 'ilike', term),
      eb.exists(eb.selectFrom('crm_contact_channels as cc').innerJoin('crm_channels as ch', 'ch.id', 'cc.channel_id').select('cc.id').whereRef('cc.record_id', '=', 'r.id').where('ch.normalized_value', 'ilike', term))
    ]))
  }
  const total = await base.select(eb => eb.fn.countAll<string>().as('n')).executeTakeFirst()
  const rows = await base
    .select([
      's.id', 's.status', 's.delivery', 's.language', 's.timezone', 's.verified_at', 's.created_at', 's.last_activity_at', 's.referred_by',
      'r.id as contact_id', 'r.name',
      sql<string | null>`(select ch.value from crm_contact_channels cc join crm_channels ch on ch.id = cc.channel_id where cc.record_id = r.id and ch.channel_type = 'email' order by cc.is_primary desc limit 1)`.as('email'),
      sql<number>`(select count(*)::int from pt_commitment c where c.subscription_id = s.id)`.as('commitments')
    ])
    .orderBy('s.created_at', 'desc')
    .limit(perPage)
    .offset((page - 1) * perPage)
    .execute()
  const anon = await tx.selectFrom('pt_subscription').select([
    eb => eb.fn.countAll<string>().as('total'),
    sql<string>`count(*) filter (where status = 'active')`.as('active')
  ]).where('contact_id', 'is', null).where('delivery', '=', 'app').executeTakeFirst()
  return {
    intercessors: rows,
    total: Number(total?.n ?? 0),
    page,
    perPage,
    anonymousApp: { total: Number(anon?.total ?? 0), active: Number(anon?.active ?? 0) }
  }
})
