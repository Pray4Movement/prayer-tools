// What the composer needs for the active site: languages, placeholders and
// whether the user may send.
export default defineMarketingHandler('marketing.access', async (_event, tx, ctx) => {
  const host = marketingHost()
  const { languages, defaultLanguage } = await host.languages(marketingTx(tx), ctx.orgId)
  return {
    site: { id: ctx.orgId, slug: ctx.orgSlug, name: ctx.orgName },
    languages,
    defaultLanguage,
    variables: host.variableList,
    canSend: ctx.perms.has('marketing.send' as never)
  }
})
