// Drains the job queue for registered types; stale `processing` jobs are reaped back to `pending`.
import { claimJobs, completeJob, failJob, jobProgress, reapStaleJobs, releaseJob, saveJobProgress, type Job } from '@prayertools/shared/jobs'
import type { WorkerContext } from '../context'
import type { Logger } from '../log'
import { captureException } from '../monitor'
import { errorMessage } from '../util'
import { JobDeferred, JobError, jobHandler, registeredJobTypes, type JobContext } from './registry'
import './handlers'

export const STALE_JOB_MINUTES = Number(process.env.JOB_STALE_TIMEOUT_MINUTES) || 15

export async function runJob(ctx: WorkerContext, job: Job, log: Logger): Promise<'completed' | 'failed' | 'retry' | 'deferred'> {
  const jlog = log.child({ job: job.id, type: job.type, site: job.org_id ?? undefined, attempt: job.attempts })
  const handler = jobHandler(job.type)
  const started = Date.now()
  if (!handler) {
    await failJob(ctx.admin, job, `No handler for job type ${job.type}`, false)
    jlog.alert('job.failed', { error: 'unknown type' })
    return 'failed'
  }
  const jctx: JobContext = {
    ...ctx,
    log: jlog,
    job,
    saveProgress: p => saveJobProgress(ctx.admin, job.id, p),
    progress: <T extends Record<string, unknown>>() => jobProgress<T>(ctx.admin, job.id)
  }
  try {
    const result = await handler(jctx, job.payload ?? {})
    await completeJob(ctx.admin, job.id, result ?? undefined)
    jlog.info('job.completed', { ms: Date.now() - started, ...(result ?? {}) })
    return 'completed'
  } catch (err) {
    if (err instanceof JobDeferred) {
      await releaseJob(ctx.admin, job.id, err.delayMs)
      jlog.info('job.deferred', { ms: Date.now() - started })
      return 'deferred'
    }
    const retryable = !(err instanceof JobError) || err.retryable
    await failJob(ctx.admin, job, errorMessage(err), retryable)
    const final = !retryable || job.attempts >= job.max_attempts
    if (final) {
      jlog.alert('job.failed', { err })
      await captureException(err, { job_type: job.type, site: job.org_id ?? undefined })
    } else {
      jlog.warn('job.retry', { err })
    }
    return final ? 'failed' : 'retry'
  }
}

// Claims and runs jobs until the queue has none due (or shutdown begins).
export async function drainJobs(ctx: WorkerContext, log: Logger, opts: { batch?: number, maxRounds?: number } = {}): Promise<number> {
  const { batch = 5, maxRounds = 20 } = opts
  let ran = 0
  for (let round = 0; round < maxRounds && !ctx.stopping(); round++) {
    const jobs = await claimJobs(ctx.admin, batch, registeredJobTypes())
    if (jobs.length === 0) break
    for (const job of jobs) {
      if (ctx.stopping()) {
        await releaseJob(ctx.admin, job.id)
        continue
      }
      await runJob(ctx, job, log)
      ran++
    }
  }
  return ran
}

export async function reapJobs(ctx: WorkerContext, log: Logger): Promise<number> {
  const n = await reapStaleJobs(ctx.admin, STALE_JOB_MINUTES)
  if (n) log.warn('jobs.reaped', { count: n })
  return n
}
