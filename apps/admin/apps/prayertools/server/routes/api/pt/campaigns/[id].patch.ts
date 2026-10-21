// Edits a campaign's setup answers, name, address, goal target, end message
// and call to action. Existing commitments keep their windows.
import { jsonb } from '@prayertools/shared/db/json'
import { parseText } from '@prayertools/shared/translatable'
import { contentLength } from '@prayertools/shared/content'

export default definePtHandler('pt.campaigns.write', async (event, tx) => {
  const id = getRouterParam(event, 'id')!
  const b = await ptBody(event)
  const row = await tx.selectFrom('pt_campaign').selectAll().where('id', '=', id).executeTakeFirst()
  if (!row) ptNotFound('Campaign not found.')
  const c = ptCampaignOut(row)
  const patch: Record<string, unknown> = ptCampaignExtras(b)
  const setupKeys = ['start_mode', 'start_date', 'end_mode', 'end_date', 'length_days', 'goal', 'cadence', 'track_time']
  if (setupKeys.some(k => k in b)) {
    const answers = ptSetupFromBody(b, 'generic', { start_mode: c.start_mode, start_date: c.start_date, end_mode: c.end_mode, end_date: c.end_date, length_days: c.length_days, goal: c.goal, cadence: c.cadence, track_time: c.track_time })
    await ptAssertNoOverlap(tx, { ...answers, timezone: (patch.timezone as string) ?? c.timezone }, id)
    if ('length_days' in b && answers.length_days) {
      const entries = await contentLength(ptTx(tx), id)
      if (entries && answers.length_days > entries) ptBadRequest(`The prayer content has ${entries} entries, so each person can go through at most ${entries}.`)
    }
    Object.assign(patch, answers)
  }
  if (patch.slug && patch.slug !== c.slug) {
    const taken = await tx.selectFrom('pt_campaign').select('id').where('slug', '=', patch.slug as string).where('id', '!=', id).executeTakeFirst()
    if (taken) ptBadRequest('That campaign address is already used on this site.')
  }
  if ('end_message' in b) patch.end_message = b.end_message ? jsonb(parseText(b.end_message)) : null
  if ('cta' in b) patch.cta = jsonb(ptCta(b.cta))
  if (Object.keys(patch).length) await tx.updateTable('pt_campaign').set({ ...patch, updated_at: new Date() } as never).where('id', '=', id).execute()
  return { ok: true }
})
