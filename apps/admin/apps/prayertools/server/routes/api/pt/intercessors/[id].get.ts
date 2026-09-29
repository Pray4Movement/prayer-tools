// One intercessor: profile, subscription, prayer times, consent, check-in
// history and prayer totals.
import { consentState, consentHistory, primaryEmailOf } from '@prayertools/shared/crm'

export default definePtHandler('pt.intercessors.read', async (event, tx) => {
  const id = getRouterParam(event, 'id')!
  const sub = await tx.selectFrom('pt_subscription').selectAll().where('id', '=', id).executeTakeFirst()
  if (!sub || !sub.contact_id) ptNotFound('Intercessor not found.')
  const contact = await tx.selectFrom('crm_records').select(['id', 'name', 'data', 'created_at']).where('id', '=', sub.contact_id).executeTakeFirst()
  const email = await primaryEmailOf(ptTx(tx), sub.contact_id)
  const commitments = await tx.selectFrom('pt_commitment as c').innerJoin('pt_campaign as k', 'k.id', 'c.campaign_id')
    .select(['c.id', 'c.campaign_id', 'k.name as campaign_name', 'c.kind', 'c.frequency', 'c.days_of_week', 'c.time', 'c.timezone', 'c.duration_min', 'c.dates', 'c.starts_on', 'c.ends_on', 'c.paused', 'c.next_reminder_utc'])
    .where('c.subscription_id', '=', id).orderBy('c.created_at').execute()
  const checkins = await tx.selectFrom('pt_checkin').select(['kind', 'sent_at', 'response', 'responded_at']).where('subscription_id', '=', id).orderBy('sent_at', 'desc').execute()
  const totals = await tx.selectFrom('pt_person_total as t').innerJoin('pt_campaign as k', 'k.id', 't.campaign_id')
    .select(['k.name as campaign_name', 't.prayers', 't.seconds', 't.last_prayed_at']).where('t.subscription_id', '=', id).execute()
  const fields = await tx.selectFrom('pt_signup_field').select(['key', 'kind', 'label', 'options']).orderBy('position').execute()
  const data = (contact?.data ?? {}) as Record<string, unknown>
  const { verify_token_hash: _v, ...subscription } = sub
  return {
    subscription,
    contact: { id: contact?.id, name: contact?.name, created_at: contact?.created_at },
    email: email?.email ?? null,
    emailVerified: email?.verified ?? false,
    answers: fields.map(f => ({ key: f.key, kind: f.kind, label: f.label, options: f.options, value: data[`pt_${f.key}`] ?? null })),
    commitments: commitments.map(c => ({ ...c, starts_on: ptCampaignOut({ start_date: c.starts_on, end_date: c.ends_on }).start_date, ends_on: ptCampaignOut({ start_date: c.starts_on, end_date: c.ends_on }).end_date })),
    checkins,
    totals,
    consent: email ? await consentState(ptTx(tx), email.channelId) : {},
    consentHistory: email ? await consentHistory(ptTx(tx), email.channelId) : []
  }
})
