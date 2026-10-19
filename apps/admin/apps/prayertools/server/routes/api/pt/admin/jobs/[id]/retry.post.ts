import { requireOperatorAdmin } from '#tenant/server'
import { retryJob } from '@prayertools/shared/jobs'

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  await retryJob(ptAdminDb(), getRouterParam(event, 'id')!)
  return { ok: true }
})
