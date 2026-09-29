import { withManaged } from '../../utils/manage'
import { setOwnStatus } from '../../utils/sub-actions'
import { limit, readJson } from '../../utils/request'

export default defineEventHandler(async (event) => {
  limit(event, 'manage', 60, 60_000)
  const body = await readJson(event)
  await withManaged(event, (tx, sub) => setOwnStatus(tx, sub, body.status))
  return { ok: true }
})
