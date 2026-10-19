export default definePtHandler('pt.intercessors.read', async (_event, tx) => {
  const stories = await tx.selectFrom('pt_story').selectAll().orderBy('created_at', 'desc').limit(500).execute()
  return { stories }
})
