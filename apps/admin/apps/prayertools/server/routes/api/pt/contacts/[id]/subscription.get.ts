// The prayer.tools side of a CRM contact: subscription, prayer times,
// check-in history and prayer totals. The contact record itself (name, email,
// signup answers, consent) is shown by the CRM.
export default definePtHandler('pt.intercessors.read', async (event, tx) => {
  const contactId = getRouterParam(event, 'id')!
  const sub = await tx.selectFrom('pt_subscription').selectAll().where('contact_id', '=', contactId).executeTakeFirst()
  if (!sub) return { subscription: null }
  const commitments = await tx.selectFrom('pt_commitment as c').innerJoin('pt_campaign as k', 'k.id', 'c.campaign_id')
    .select(['c.id', 'c.campaign_id', 'k.name as campaign_name', 'c.kind', 'c.frequency', 'c.days_of_week', 'c.time', 'c.timezone', 'c.duration_min', 'c.dates', 'c.starts_on', 'c.ends_on', 'c.paused', 'c.next_reminder_utc'])
    .where('c.subscription_id', '=', sub.id).orderBy('c.created_at').execute()
  const checkins = await tx.selectFrom('pt_checkin').select(['kind', 'sent_at', 'response', 'responded_at']).where('subscription_id', '=', sub.id).orderBy('sent_at', 'desc').execute()
  const totals = await tx.selectFrom('pt_person_total as t').innerJoin('pt_campaign as k', 'k.id', 't.campaign_id')
    .select(['k.name as campaign_name', 't.prayers', 't.seconds', 't.last_prayed_at']).where('t.subscription_id', '=', sub.id).execute()
  const { verify_token_hash: _v, ...subscription } = sub
  return {
    subscription,
    commitments: commitments.map(c => ({ ...c, starts_on: ptCampaignOut({ start_date: c.starts_on, end_date: c.ends_on }).start_date, ends_on: ptCampaignOut({ start_date: c.starts_on, end_date: c.ends_on }).end_date })),
    checkins,
    totals
  }
})
