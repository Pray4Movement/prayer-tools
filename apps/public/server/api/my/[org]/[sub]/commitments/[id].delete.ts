import { withMySubscription } from '../../../../../utils/my'
import { removeCommitment } from '../../../../../utils/sub-actions'
import { limit } from '../../../../../utils/request'
import { isUuid } from '../../../../../lib/input'

export default defineEventHandler(async (event) => {
  limit(event, 'my', 60, 60_000)
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 404 })
  await withMySubscription(event, (tx, sub) => removeCommitment(tx, sub, id))
  return { ok: true }
})
