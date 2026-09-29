import { audienceCounts } from '../../../../lib/audiences'

// Each audience with its count of eligible recipients (opted in to the
// audience's purpose, not suppressed); `selected` adds the combined count.
export default defineMarketingHandler('marketing.access', async (event, tx, ctx) => {
  const q = getQuery(event)
  const selected = String(q.selected ?? '').split(',').map(s => s.trim()).filter(Boolean)
  return await audienceCounts(marketingHost(), marketingTx(tx), ctx.orgId, selected)
})
