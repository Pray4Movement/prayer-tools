import { campaignStatus, displayLength } from '@prayertools/shared/setup'
import { goalProgress } from '@prayertools/shared/stats'
import { campaignEntries, campaignLibraries, contentLength } from '@prayertools/shared/content'

export default definePtHandler('pt.site.read', async (event, tx) => {
  const id = getRouterParam(event, 'id')!
  const site = await ptSite(tx)
  const row = await tx.selectFrom('pt_campaign').selectAll().where('id', '=', id).executeTakeFirst()
  if (!row) ptNotFound('Campaign not found.')
  const c = ptCampaignOut(row)
  const commitments = await tx.selectFrom('pt_commitment').select(eb => eb.fn.countAll<string>().as('n')).where('campaign_id', '=', c.id).executeTakeFirst()
  return {
    campaign: {
      ...c,
      status: campaignStatus(c),
      length: displayLength(c),
      entries: await campaignEntries(ptTx(tx), c),
      commitments: Number(commitments?.n ?? 0),
      contentEntries: await contentLength(ptTx(tx), c.id),
      progress: await goalProgress(ptTx(tx), c, site.settings_merged.default_duration_min)
    },
    libraries: await campaignLibraries(ptTx(tx), c.id)
  }
})
