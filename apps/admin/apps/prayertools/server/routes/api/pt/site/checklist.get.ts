// The launch checklist for the site and its current campaign.
export default definePtHandler('pt.site.read', async (_event, tx) => {
  const items = await ptLaunchChecklist(tx)
  return { items, canPublish: items.every(i => !i.required || i.done) }
})
