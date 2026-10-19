// Deletes a campaign nobody has joined yet.
export default definePtHandler('pt.campaigns.write', async (event, tx) => {
  const id = getRouterParam(event, 'id')!
  const used = await tx.selectFrom('pt_commitment').select('id').where('campaign_id', '=', id).executeTakeFirst()
  if (used) ptBadRequest('People have joined this campaign; close it instead.')
  await tx.deleteFrom('pt_campaign').where('id', '=', id).execute()
  return { ok: true }
})
