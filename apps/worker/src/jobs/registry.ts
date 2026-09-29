// Job handlers by type. `JobError(msg, false)` fails at once, other errors retry with backoff;
// `JobDeferred` requeues without counting the attempt (shutdown mid-job).
import type { Job } from '@prayertools/shared/jobs'
import type { WorkerContext } from '../context'
import type { Logger } from '../log'

export interface JobContext extends WorkerContext {
  log: Logger
  job: Job
  // Stores progress in the job's `result` (and refreshes its heartbeat).
  saveProgress: (progress: Record<string, unknown>) => Promise<void>
  progress: <T extends Record<string, unknown>>() => Promise<Partial<T>>
}

export type JobHandler = (ctx: JobContext, payload: Record<string, unknown>) => Promise<Record<string, unknown> | void>

export class JobError extends Error {
  constructor(message: string, readonly retryable = true) {
    super(message)
    this.name = 'JobError'
  }
}

export class JobDeferred extends Error {
  constructor(readonly delayMs = 0) {
    super('Job deferred')
    this.name = 'JobDeferred'
  }
}

const handlers = new Map<string, JobHandler>()

export function registerJobHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler)
}

export function jobHandler(type: string): JobHandler | undefined {
  return handlers.get(type)
}

export function registeredJobTypes(): string[] {
  return [...handlers.keys()]
}

export function requireString(payload: Record<string, unknown>, key: string): string {
  const v = payload[key]
  if (typeof v !== 'string' || !v) throw new JobError(`payload.${key} is required`, false)
  return v
}
