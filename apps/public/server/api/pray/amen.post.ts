import { withOrg } from '@prayertools/shared/db/scope'
import { useDb } from '../../utils/db'
import { limit, readJson } from '../../utils/request'
import { siteContext } from '../../utils/site-context'
import { markAmen } from '../../utils/prayer'
import { isUuid } from '../../lib/input'

export default defineEventHandler(async (event) => {
  const ctx = siteContext(event)
  limit(event, 'amen', 20, 60_000)
  const body = await readJson(event, 1024)
  if (!isUuid(body.id)) throw createError({ statusCode: 400 })
  await withOrg(useDb(), ctx.orgId, tx => markAmen(tx, body.id as string))
  return { ok: true }
})
