// Download my data across every site.
import { withOrg } from '@prayertools/shared/db/scope'
import { personData } from '@prayertools/shared/subscriptions'
import { useDb } from '../../utils/db'
import { personSubscriptions, requireMySession } from '../../utils/my'

export default defineEventHandler(async (event) => {
  const intercessorId = await requireMySession(event)
  const person = await useDb().selectFrom('pt_intercessor').select(['email', 'created_at']).where('id', '=', intercessorId).executeTakeFirst()
  const sites = []
  for (const s of await personSubscriptions(intercessorId)) {
    const org = await useDb().selectFrom('orgs').select(['name', 'slug']).where('id', '=', s.org_id).executeTakeFirst()
    sites.push({ site: org?.name ?? null, ...(await withOrg(useDb(), s.org_id, tx => personData(tx, s.id))) })
  }
  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
  setResponseHeader(event, 'content-disposition', 'attachment; filename="my-prayer-data.json"')
  return JSON.stringify({ email: person?.email ?? null, since: person?.created_at ?? null, sites }, null, 2)
})
