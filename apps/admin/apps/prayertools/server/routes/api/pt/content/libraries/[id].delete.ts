// Removes content from a campaign. The site keeps its copy (and edits) in
// case it is added again or used by another campaign.
export default definePtHandler('pt.content.write', async (event, tx) => {
  const id = getRouterParam(event, 'id')!
  const campaignId = String(getQuery(event).campaign ?? '')
  await tx.deleteFrom('pt_campaign_library').where('site_library_id', '=', id).where('campaign_id', '=', campaignId).execute()
  return { ok: true }
})
