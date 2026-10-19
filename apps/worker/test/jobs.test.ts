import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { enqueue } from '@prayertools/shared/jobs'
import { drainJobs } from '../src/jobs/processor'
import { JobDeferred, JobError, registerJobHandler } from '../src/jobs/registry'
import { cleanup, closeEnv, createSite, makeJobsDue, testCtx, testEnv, type TestEnv } from './helpers'

let env: TestEnv
beforeAll(() => { env = testEnv() })
afterEach(async () => { await cleanup(env) })
afterAll(async () => { await closeEnv(env) })

const seen: Record<string, unknown>[] = []
registerJobHandler('test_ok', async (_ctx, payload) => {
  seen.push(payload)
  return { echoed: payload.n }
})
registerJobHandler('test_fatal', async () => { throw new JobError('bad payload', false) })
registerJobHandler('test_flaky', async () => { throw new Error('temporary') })
registerJobHandler('test_resume', async (ctx) => {
  const p = await ctx.progress<{ step: number }>()
  const step = (p.step ?? 0) + 1
  await ctx.saveProgress({ step })
  if (step < 2) throw new JobDeferred()
  return { step }
})

async function job(id: string) {
  return await env.admin.selectFrom('pt_job').selectAll().where('id', '=', id).executeTakeFirstOrThrow()
}

describe('job processor', () => {
  it('runs registered handlers and stores their result', async () => {
    const { orgId } = await createSite(env)
    const id = (await enqueue(env.admin, 'test_ok' as never, { n: 7 }, { orgId }))!
    const ctx = testCtx(env)
    await drainJobs(ctx, ctx.log)
    const row = await job(id)
    expect(row.status).toBe('completed')
    expect(row.result).toEqual({ echoed: 7 })
    expect(seen).toContainEqual({ n: 7 })
  })

  it('fails a non-retryable error at once and logs an alert', async () => {
    const { orgId } = await createSite(env)
    const id = (await enqueue(env.admin, 'test_fatal' as never, {}, { orgId }))!
    const ctx = testCtx(env)
    await drainJobs(ctx, ctx.log)
    const row = await job(id)
    expect(row.status).toBe('failed')
    expect(row.error_message).toBe('bad payload')
    expect(ctx.logs.some(l => l.level === 'alert' && l.msg === 'job.failed')).toBe(true)
  })

  it('retries with backoff until max_attempts, then fails', async () => {
    const { orgId } = await createSite(env)
    const id = (await enqueue(env.admin, 'test_flaky' as never, {}, { orgId, maxAttempts: 2 }))!
    const ctx = testCtx(env)
    await drainJobs(ctx, ctx.log)
    let row = await job(id)
    expect(row.status).toBe('pending')
    expect(row.scheduled_at.getTime()).toBeGreaterThan(Date.now())
    await makeJobsDue(env)
    await drainJobs(ctx, ctx.log)
    row = await job(id)
    expect(row.status).toBe('failed')
    expect(row.attempts).toBe(2)
  })

  it('a deferred job keeps its progress and does not use up an attempt', async () => {
    const { orgId } = await createSite(env)
    const id = (await enqueue(env.admin, 'test_resume' as never, {}, { orgId, maxAttempts: 1 }))!
    const ctx = testCtx(env)
    await drainJobs(ctx, ctx.log, { maxRounds: 1 })
    let row = await job(id)
    expect(row.status).toBe('pending')
    expect(row.attempts).toBe(0)
    expect(row.result).toEqual({ step: 1 })
    await drainJobs(ctx, ctx.log)
    row = await job(id)
    expect(row.status).toBe('completed')
    expect(row.result).toEqual({ step: 2 })
  })

  it('an unknown job type is never claimed by this worker', async () => {
    const { orgId } = await createSite(env)
    const id = (await enqueue(env.admin, 'someone_elses_type' as never, {}, { orgId }))!
    const ctx = testCtx(env)
    await drainJobs(ctx, ctx.log)
    expect((await job(id)).status).toBe('pending')
  })
})
