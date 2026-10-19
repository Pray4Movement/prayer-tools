import { withManaged } from '../../../utils/manage'
import { addCommitment } from '../../../utils/sub-actions'
import { limit, readJson } from '../../../utils/request'

export default defineEventHandler(async (event) => {
  limit(event, 'manage', 60, 60_000)
  const body = await readJson(event)
  await withManaged(event, (tx, sub) => addCommitment(tx, sub, typeof body.campaign === 'string' ? body.campaign : null, body))
  return { ok: true }
})
