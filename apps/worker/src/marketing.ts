// Site email and multi-site sends: the marketing layer's delivery engine,
// run with prayer.tools' host adapter.
import { processMarketing } from '../../admin/apps/marketing/lib/deliver'
import { ptMarketingHost } from '@prayertools/shared/marketing-host'
import type { WorkerContext } from './context'
import type { Logger } from './log'

export async function runMarketing(ctx: WorkerContext, log: Logger) {
  const res = await processMarketing({ adminDb: ctx.admin, appDb: ctx.app, host: ptMarketingHost, now: ctx.now(), limit: 1000, log: (m, f) => log.warn(`marketing.${m}`, f) })
  if (res.sent || res.failed || res.paused || res.started) log.info('marketing.run', { ...res })
  return res
}
