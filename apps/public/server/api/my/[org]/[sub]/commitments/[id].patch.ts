import { withMySubscription } from '../../../../../utils/my'
import { patchCommitment } from '../../../../../utils/sub-actions'
import { limit, readJson } from '../../../../../utils/request'
import { isUuid } from '../../../../../lib/input'

export default defineEventHandler(async (event) => {
  limit(event, 'my', 60, 60_000)
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 404 })
  const body = await readJson(event)
  await withMySubscription(event, (tx, sub) => patchCommitment(tx, sub, id, body))
  return { ok: true }
})
