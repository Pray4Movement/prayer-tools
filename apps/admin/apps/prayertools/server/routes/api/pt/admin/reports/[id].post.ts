// Marks a report handled; `unlist: true` also removes the site from the directory.
import { requireOperatorAdmin } from '#tenant/server'

export default defineEventHandler(async (event) => {
  const { userId } = await requireOperatorAdmin(event)
  const { unlist } = await ptBody<{ unlist?: boolean }>(event)
  const db = ptAdminDb()
  const report = await db.updateTable('pt_site_report').set({ handled_at: new Date(), handled_by: userId }).where('id', '=', getRouterParam(event, 'id')!).returning('org_id').executeTakeFirst()
  if (!report) ptNotFound('Report not found.')
  if (unlist) await db.updateTable('pt_directory_entry').set({ status: 'unlisted', reviewed_by: userId, reviewed_at: new Date() }).where('org_id', '=', report.org_id).execute()
  return { ok: true }
})
