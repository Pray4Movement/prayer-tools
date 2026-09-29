// Marks a translation as following the latest edit (clears "out of date").
export default definePtHandler('pt.content.translate', async (event, tx) => {
  const b = await ptBody<{ siteLibraryId?: string, day?: number, lang?: string }>(event)
  await tx.updateTable('pt_site_entry').set({ stale: false })
    .where('site_library_id', '=', String(b.siteLibraryId)).where('day', '=', Number(b.day)).where('language', '=', String(b.lang)).execute()
  return { ok: true }
})
