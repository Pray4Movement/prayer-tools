import { updateCommitment } from '@prayertools/shared/subscriptions'
import { validateRule } from '@prayertools/shared/schedule'

export default definePtHandler('pt.intercessors.write', async (event, tx) => {
  const id = getRouterParam(event, 'id')!
  const cid = getRouterParam(event, 'cid')!
  const b = await ptBody<{ frequency?: 'daily' | 'weekly', days_of_week?: number[], time?: string, duration_min?: number | null, paused?: boolean }>(event)
  const sub = await tx.selectFrom('pt_subscription').selectAll().where('id', '=', id).executeTakeFirst()
  if (!sub) ptNotFound('Intercessor not found.')
  if (b.time || b.frequency) {
    const errors = validateRule({ kind: 'recurring', frequency: b.frequency ?? 'daily', days_of_week: b.days_of_week ?? [], time: b.time ?? '00:00', duration_min: b.duration_min ?? null })
    if (errors.length) ptBadRequest('Please check the prayer time.', { errors })
  }
  const updated = await updateCommitment(ptTx(tx), sub, cid, b)
  if (!updated) ptNotFound('Prayer time not found.')
  return { ok: true }
})
