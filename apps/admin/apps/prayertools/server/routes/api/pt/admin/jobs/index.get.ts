// Failed and recent jobs, for the operator jobs page.
import { requireOperatorAdmin } from '#tenant/server'

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  const status = String(getQuery(event).status ?? 'failed')
  const jobs = await ptAdminDb().selectFrom('pt_job as j').leftJoin('orgs as o', 'o.id', 'j.org_id')
    .select(['j.id', 'j.type', 'j.status', 'j.attempts', 'j.max_attempts', 'j.error_message', 'j.scheduled_at', 'j.last_attempt_at', 'j.created_at', 'j.reference_type', 'j.reference_id', 'o.slug as site_slug'])
    .$if(['pending', 'processing', 'completed', 'failed'].includes(status), qb => qb.where('j.status', '=', status as never))
    .orderBy('j.created_at', 'desc').limit(200).execute()
  const counts = await ptAdminDb().selectFrom('pt_job').select(['status', eb => eb.fn.countAll<string>().as('n')]).groupBy('status').execute()
  return { jobs, counts: Object.fromEntries(counts.map(c => [c.status, Number(c.n)])) }
})
