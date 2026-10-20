// A campaign's content: its stacked libraries with language coverage, and
// whether a followed library's copy has a newer published version.
export default definePtHandler('pt.site.read', async (event, tx) => {
  const campaignId = String(getQuery(event).campaign ?? '')
  const site = await ptSite(tx)
  if (!/^[0-9a-f-]{36}$/.test(campaignId)) return { libraries: [], languages: site.languages, defaultLanguage: site.default_language }
  const libraries = await ptCampaignLibraries(tx, campaignId, site.languages)
  return { libraries, languages: site.languages, defaultLanguage: site.default_language }
})
