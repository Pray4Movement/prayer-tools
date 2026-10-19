// Download my data: profile, reminder times, consent history and custom answers for this site.
import { personData } from '@prayertools/shared/subscriptions'
import { withManaged } from '../../utils/manage'

export default defineEventHandler(async (event) => {
  const data = await withManaged(event, async (tx, sub, ctx) => ({ site: { name: ctx.name, url: ctx.canonicalOrigin }, ...(await personData(tx, sub.id)) }))
  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
  setResponseHeader(event, 'content-disposition', 'attachment; filename="my-prayer-data.json"')
  return JSON.stringify(data, null, 2)
})
