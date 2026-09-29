import { jsonb, textArray } from '../../../../../lib/db'

// Drafts only; a scheduled email goes back to draft to be edited.
export default defineMarketingHandler('marketing.send', async (event, tx, ctx) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const host = marketingHost()
  const { languages } = await host.languages(marketingTx(tx), ctx.orgId)
  const input = marketingDraftInput(await marketingBody(event), languages.map(l => l.code))
  const res = await tx
    .updateTable('marketing_email')
    .set({ versions: jsonb(input.versions), source_language: input.sourceLanguage, audiences: textArray(input.audiences), updated_at: new Date() })
    .where('id', '=', id)
    .where('status', '=', 'draft')
    .executeTakeFirst()
  if (!Number(res.numUpdatedRows)) throw createError({ statusCode: 409, statusMessage: 'Only drafts can be edited.' })
  return { ok: true }
})
