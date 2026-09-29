import { jsonb, textArray } from '../../../../../lib/db'

export default defineMarketingHandler('marketing.send', async (event, tx, ctx) => {
  const host = marketingHost()
  const { languages } = await host.languages(marketingTx(tx), ctx.orgId)
  const input = marketingDraftInput(await marketingBody(event), languages.map(l => l.code))
  const row = await tx
    .insertInto('marketing_email')
    .values({
      versions: jsonb(input.versions),
      source_language: input.sourceLanguage,
      audiences: textArray(input.audiences),
      created_by: ctx.userId
    })
    .returning('id')
    .executeTakeFirstOrThrow()
  return { id: row.id }
})
