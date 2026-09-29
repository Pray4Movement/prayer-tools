// Adds a prayer time for an intercessor in a campaign.
import { insertCommitment, validateRuleForCampaign, type RuleInput } from '@prayertools/shared/subscriptions'

export default definePtHandler('pt.intercessors.write', async (event, tx) => {
  const id = getRouterParam(event, 'id')!
  const b = await ptBody<RuleInput & { campaignId?: string }>(event)
  const sub = await tx.selectFrom('pt_subscription').selectAll().where('id', '=', id).executeTakeFirst()
  if (!sub) ptNotFound('Intercessor not found.')
  const campaign = await tx.selectFrom('pt_campaign').selectAll().where('id', '=', String(b.campaignId)).executeTakeFirst()
  if (!campaign) ptNotFound('Campaign not found.')
  const errors = validateRuleForCampaign(b, campaign)
  if (errors.length) ptBadRequest('Please check the prayer time.', { errors })
  const c = await insertCommitment(ptTx(tx), sub, campaign, b)
  return { id: c.id }
})
