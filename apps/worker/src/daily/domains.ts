// Custom-domain health check: pending → active, active → failing (admins alerted once), failing → active.
// `pt_site_domain` is global, so it is written on the admin connection.
import { enqueue } from '@prayertools/shared/jobs'
import { jsonb } from '@prayertools/shared/db/json'
import type { WorkerContext } from '../context'
import type { Logger } from '../log'
import { mapPool } from '../util'

export async function checkDomains(ctx: WorkerContext, log: Logger): Promise<Record<string, number>> {
  const domains = await ctx.admin.selectFrom('pt_site_domain').selectAll().orderBy('last_checked_at', 'asc').execute()
  const counts = { checked: 0, activated: 0, failing: 0, recovered: 0, alerted: 0, errors: 0 }
  const results = await mapPool(domains, 5, async (d) => {
    const now = ctx.now()
    const status = await ctx.hostnameStatus(d.hostname, d.cf_hostname_id)
    const base = {
      last_checked_at: now,
      verification: jsonb({ records: status.records, detail: status.detail ?? null }),
      ...(status.id && !d.cf_hostname_id ? { cf_hostname_id: status.id } : {})
    }
    const dlog = log.child({ site: d.org_id, domain: d.hostname })
    if (d.status === 'pending' && status.status === 'active') {
      await ctx.admin.updateTable('pt_site_domain').set({ ...base, status: 'active', activated_at: now, failing_since: null, alerted_at: null }).where('id', '=', d.id).execute()
      counts.activated++
      dlog.info('domain.activated')
    } else if (d.status === 'active' && status.status !== 'active') {
      await ctx.admin.updateTable('pt_site_domain').set({ ...base, status: 'failing', failing_since: now }).where('id', '=', d.id).execute()
      counts.failing++
      dlog.warn('domain.failing', { detail: status.detail })
    } else if (d.status === 'failing' && status.status === 'active') {
      await ctx.admin.updateTable('pt_site_domain').set({ ...base, status: 'active', failing_since: null, alerted_at: null }).where('id', '=', d.id).execute()
      counts.recovered++
      dlog.info('domain.recovered')
    } else {
      await ctx.admin.updateTable('pt_site_domain').set(base).where('id', '=', d.id).execute()
    }
    const failingNow = (d.status === 'active' || d.status === 'failing') && status.status !== 'active'
    if (failingNow && !d.alerted_at) {
      const alerted = await ctx.admin.transaction().execute(async (tx) => {
        const claimed = await tx.updateTable('pt_site_domain').set({ alerted_at: now }).where('id', '=', d.id).where('alerted_at', 'is', null).returning('id').executeTakeFirst()
        if (claimed) await enqueue(tx, 'domain_alert', { domain: d.hostname, orgId: d.org_id, state: 'failing' }, { orgId: d.org_id, referenceType: 'domain', referenceId: d.id })
        return !!claimed
      })
      if (alerted) counts.alerted++
    }
    counts.checked++
  })
  for (const [i, r] of results.entries()) {
    if (!r.ok) {
      counts.errors++
      log.error('domain.check_failed', { site: domains[i]!.org_id, domain: domains[i]!.hostname, err: r.error })
    }
  }
  return counts
}
