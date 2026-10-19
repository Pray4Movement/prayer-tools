// Approving a share request publishes the library to the catalog for everyone.
import { requireOperatorAdmin } from '#tenant/server'

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  const { approve } = await ptBody<{ approve?: boolean }>(event)
  await ptAdminDb().updateTable('pt_library').set({
    share_status: approve ? 'approved' : 'rejected',
    ...(approve ? { visibility: 'published' as const } : {}),
    updated_at: new Date()
  }).where('id', '=', getRouterParam(event, 'id')!).execute()
  return { ok: true }
})
