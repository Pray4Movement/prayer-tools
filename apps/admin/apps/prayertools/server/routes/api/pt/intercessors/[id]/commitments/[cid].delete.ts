export default definePtHandler('pt.intercessors.write', async (event, tx) => {
  await tx.deleteFrom('pt_commitment').where('id', '=', getRouterParam(event, 'cid')!).where('subscription_id', '=', getRouterParam(event, 'id')!).execute()
  return { ok: true }
})
