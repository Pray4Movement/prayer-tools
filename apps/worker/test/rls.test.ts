import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { sql } from 'kysely'
import { withOrg } from '@prayertools/shared/db/scope'
import { addDays, todayIn } from '@prayertools/shared/dates'
import { SCHEDULED_JOBS } from '../src/daily'
import { drainJobs } from '../src/jobs/processor'
import { runReminderSweep } from '../src/reminders'
import { addCommitment, cleanup, closeEnv, createCampaign, createSite, createSubscriber, testCtx, testEnv, type TestEnv } from './helpers'
import { DAY } from '../src/util'

// Tables the admin (BYPASSRLS) connection may write: global tables, the
// reminder claim stamp, and platform-wide expiry of raw analytics.
const ADMIN_WRITABLE = new Set([
  'pt_job', 'pt_site_domain', 'pt_intercessor', 'pt_my_token', 'pt_my_session',
  'pt_event', 'pt_stat_visitor_day', 'pt_commitment'
])

const queries: string[] = []
let env: TestEnv
beforeAll(() => { env = testEnv({ debug: (_c: number, q: string) => { queries.push(q) } } as never) })
afterEach(async () => { await cleanup(env) })
afterAll(async () => { await closeEnv(env) })

function writesIn(q: string): string[] {
  const out: string[] = []
  for (const m of q.matchAll(/(?<!for\s+)\b(insert\s+into|update|delete\s+from)\s+"?([a-z_0-9]+)"?/gi)) out.push(m[2]!.toLowerCase())
  return out
}

describe('connections', () => {
  it('the app connection is the RLS role and sees only the current org', async () => {
    const a = await createSite(env)
    const b = await createSite(env)
    await createCampaign(env, a.orgId)
    await createCampaign(env, b.orgId)
    const who = await sql<{ u: string, bypass: boolean }>`select current_user as u, rolbypassrls as bypass from pg_roles where rolname = current_user`.execute(env.app)
    expect(who.rows[0]).toEqual({ u: 'pt2_app', bypass: false })
    const seen = await withOrg(env.app, a.orgId, tx => tx.selectFrom('pt_campaign').select('org_id').execute())
    expect(new Set(seen.map(r => r.org_id))).toEqual(new Set([a.orgId]))
    const outside = await env.app.selectFrom('pt_campaign').select('id').execute()
    expect(outside).toHaveLength(0)
  })

  it('every write of site data goes through the RLS connection', async () => {
    const { orgId } = await createSite(env)
    const today = todayIn('America/New_York')
    const ended = await createCampaign(env, orgId, { startDate: addDays(today, -10), endDate: addDays(today, -1) })
    const ongoing = await createCampaign(env, orgId, { startDate: addDays(today, -100), endMode: 'none' })
    const quiet = new Date(Date.now() - 40 * DAY)
    const a = await createSubscriber(env, orgId, ended)
    await addCommitment(env, orgId, a.subscriptionId, ended, { startsOn: addDays(today, -10), endsOn: addDays(today, -1) })
    const b = await createSubscriber(env, orgId, ongoing, { createdAt: quiet, lastActivityAt: quiet, cycleStartedAt: quiet })
    await addCommitment(env, orgId, b.subscriptionId, ongoing, { startsOn: addDays(today, -100), next: new Date(Date.now() - 60_000) })
    await createSubscriber(env, orgId, ongoing, { verified: false, createdAt: new Date(Date.now() - 9 * DAY) })
    await withOrg(env.admin, orgId, tx => tx.updateTable('pt_subscription').set({ status: 'unsubscribed', unsubscribed_at: new Date(Date.now() - 400 * DAY) }).where('id', '=', a.subscriptionId).execute())

    queries.length = 0
    const ctx = testCtx(env)
    await runReminderSweep(ctx, ctx.log)
    for (const job of SCHEDULED_JOBS) await job.run(ctx, ctx.log)
    await drainJobs(ctx, ctx.log)
    expect(ctx.mails.length).toBeGreaterThanOrEqual(2)

    const written = new Set(queries.flatMap(writesIn))
    expect(written.has('pt_job')).toBe(true)
    const outside = [...written].filter(t => !ADMIN_WRITABLE.has(t))
    expect(outside).toEqual([])
    // The only admin write to pt_commitment is the claim stamp.
    const commitmentWrites = queries.filter(q => writesIn(q).includes('pt_commitment'))
    expect(commitmentWrites.every(q => /SET claimed_at = \$\d+::timestamptz\s+FROM due/.test(q))).toBe(true)
  })
})
