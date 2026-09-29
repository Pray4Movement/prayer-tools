import { describeUnsubscribe } from '../../../../../lib/unsubscribe'

// Public: what the unsubscribe page shows before the person confirms.
export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token ?? '')
  const info = await describeUnsubscribe(marketingHost(), marketingDb(), token)
  if (!info) throw createError({ statusCode: 400, statusMessage: 'This unsubscribe link is not valid.' })
  return info
})
