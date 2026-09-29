export default definePtHandler('pt.content.write', async (event, tx) => {
  const b = await ptBody<{ campaignId?: string, ids?: string[] }>(event)
  const ids = Array.isArray(b.ids) ? b.ids : []
  for (const [i, id] of ids.entries()) {
    await tx.updateTable('pt_campaign_library').set({ position: i }).where('campaign_id', '=', String(b.campaignId)).where('site_library_id', '=', id).execute()
  }
  return { ok: true }
})
