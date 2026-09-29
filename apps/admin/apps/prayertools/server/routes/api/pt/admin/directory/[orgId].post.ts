// Operators approve a directory listing or unlist a site. The site stays
// reachable by its link either way.
import { requireOperatorAdmin } from '#tenant/server'

export default defineEventHandler(async (event) => {
  const { userId } = await requireOperatorAdmin(event)
  const { status } = await ptBody<{ status?: string }>(event)
  if (status !== 'listed' && status !== 'unlisted') ptBadRequest('Status must be listed or unlisted.')
  await ptAdminDb().updateTable('pt_directory_entry').set({ status, reviewed_by: userId, reviewed_at: new Date(), updated_at: new Date() })
    .where('org_id', '=', getRouterParam(event, 'orgId')!).execute()
  return { ok: true }
})
