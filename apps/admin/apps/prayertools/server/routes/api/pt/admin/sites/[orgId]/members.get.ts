import { requireOperatorAdmin } from '#tenant/server'

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  const members = await ptAdminDb().selectFrom('memberships as m').innerJoin('users as u', 'u.id', 'm.user_id')
    .select(['u.id', 'u.email', 'u.display_name', 'm.roles']).where('m.org_id', '=', getRouterParam(event, 'orgId')!).execute()
  return { members }
})
