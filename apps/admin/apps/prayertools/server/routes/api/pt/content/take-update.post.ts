export default definePtHandler('pt.content.write', async (event, tx) => {
  const b = await ptBody<{ siteLibraryId?: string }>(event)
  await ptTakeLibraryUpdate(tx, String(b.siteLibraryId ?? ''))
  return { ok: true }
})
