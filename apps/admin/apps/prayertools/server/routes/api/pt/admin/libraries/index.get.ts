// Share requests waiting for review, plus the platform libraries.
import { requireOperatorAdmin } from '#tenant/server'

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  const db = ptAdminDb()
  const requests = await db.selectFrom('pt_library as l').leftJoin('users as u', 'u.id', 'l.owner_user_id')
    .select(['l.id', 'l.title', 'l.description', 'l.license', 'l.license_note', 'l.credit', 'l.languages', 'l.entry_count', 'l.share_status', 'l.share_requested_at', 'l.rights_confirmed', 'u.display_name as owner_name', 'u.email as owner_email'])
    .where('l.share_status', '=', 'requested').orderBy('l.share_requested_at').execute()
  const platform = await db.selectFrom('pt_library').selectAll().where('owner_user_id', 'is', null).orderBy('title').execute()
  return { requests, platform }
})
