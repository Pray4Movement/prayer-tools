import { requireOperatorAdmin } from '#tenant/server'

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  const entries = await ptAdminDb().selectFrom('pt_directory_entry').selectAll().orderBy('requested_at', 'desc').execute()
  return { entries }
})
