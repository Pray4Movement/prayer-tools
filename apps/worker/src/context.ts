// Passed to every sweep, job and scheduled job. `admin` (BYPASSRLS) is for set-based
// reads across sites and global tables; `app` (RLS) for every site write, inside `withOrg`.
import { createDb } from '@prayertools/shared/db/connect'
import type { Db } from '@prayertools/shared/db/scope'
import { sendMail, type OutgoingMail, type SendResult } from '@prayertools/shared/email/transport'
import { hostnameStatus, type HostnameStatus } from '@prayertools/shared/cloudflare'
import { createLogger, type Logger } from './log'
import { oneSignalSender, type PushSender } from './push'

export interface WorkerContext {
  admin: Db
  app: Db
  log: Logger
  sendMail: (mail: OutgoingMail) => Promise<SendResult>
  push: PushSender | null
  hostnameStatus: (hostname: string, id: string | null) => Promise<HostnameStatus>
  now: () => Date
  // True once shutdown began; long work checks it between batches.
  stopping: () => boolean
}

export function createContext(overrides: Partial<WorkerContext> = {}): WorkerContext {
  const adminUrl = process.env.DATABASE_URL
  const appUrl = process.env.APP_DATABASE_URL
  if (!overrides.admin && !adminUrl) throw new Error('DATABASE_URL is required')
  if (!overrides.app && !appUrl) throw new Error('APP_DATABASE_URL is required')
  return {
    admin: overrides.admin ?? createDb(adminUrl!, { max: Number(process.env.DB_POOL_ADMIN || 8) }),
    app: overrides.app ?? createDb(appUrl!, { max: Number(process.env.DB_POOL_APP || 15) }),
    log: overrides.log ?? createLogger({ process: 'worker' }),
    sendMail: overrides.sendMail ?? sendMail,
    push: overrides.push !== undefined ? overrides.push : oneSignalSender(),
    hostnameStatus: overrides.hostnameStatus ?? hostnameStatus,
    now: overrides.now ?? (() => new Date()),
    stopping: overrides.stopping ?? (() => false)
  }
}

export async function closeContext(ctx: WorkerContext): Promise<void> {
  await Promise.allSettled([ctx.admin.destroy(), ctx.app.destroy()])
}
