import { withManaged } from '../../../utils/manage'
import { patchCommitment } from '../../../utils/sub-actions'
import { limit, readJson } from '../../../utils/request'
import { isUuid } from '../../../lib/input'

export default defineEventHandler(async (event) => {
  limit(event, 'manage', 60, 60_000)
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 404 })
  const body = await readJson(event)
  await withManaged(event, (tx, sub) => patchCommitment(tx, sub, id, body))
  return { ok: true }
})
