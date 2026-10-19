// One-off calendar file for a single prayer time: `/api/manage/commitments/<id>.ics`.
import { withManaged } from '../../../utils/manage'
import { commitmentIcs } from '../../../utils/ics'
import { isUuid } from '../../../lib/input'

export default defineEventHandler(async (event) => {
  const id = (getRouterParam(event, 'id') ?? '').replace(/\.ics$/, '')
  if (!isUuid(id)) throw createError({ statusCode: 404 })
  const ics = await withManaged(event, (tx, sub, ctx) => commitmentIcs(tx, ctx, sub, id))
  if (!ics) throw createError({ statusCode: 404 })
  setResponseHeader(event, 'content-type', 'text/calendar; charset=utf-8')
  setResponseHeader(event, 'content-disposition', 'attachment; filename="prayer-time.ics"')
  return ics
})
