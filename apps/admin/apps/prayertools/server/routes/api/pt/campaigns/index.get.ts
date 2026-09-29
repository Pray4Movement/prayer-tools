import { campaignStatus, displayLength } from '@prayertools/shared/setup'
import { goalProgress } from '@prayertools/shared/stats'

export default definePtHandler('pt.site.read', async (_event, tx) => {
  const site = await ptSite(tx)
  const rows = (await tx.selectFrom('pt_campaign').selectAll().orderBy('start_date', 'desc').orderBy('created_at', 'desc').execute()).map(ptCampaignOut)
  const campaigns = []
  for (const c of rows) {
    campaigns.push({
      ...c,
      status: campaignStatus(c),
      length: displayLength(c),
      progress: await goalProgress(ptTx(tx), c, site.settings_merged.default_duration_min)
    })
  }
  return { campaigns }
})
