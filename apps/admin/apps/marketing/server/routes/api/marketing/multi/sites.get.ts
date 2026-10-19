// Every site where the user may send, with its languages.
export default defineMarketingUserHandler(async (_event, _tx, userId) => {
  const sites = await marketingSendableSites(userId)
  const { languages, perSite } = await marketingSitesLanguages(sites.map(s => s.id))
  return {
    sites: sites.map(s => ({ ...s, ...perSite[s.id] })),
    languages,
    variables: marketingHost().variableList
  }
})
