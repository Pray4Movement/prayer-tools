// Who exported the site's intercessors, and when (owners).
export default definePtHandler('pt.site.manage', async (_event, tx) => {
  const rows = await tx.selectFrom('pt_export_log as e').innerJoin('users as u', 'u.id', 'e.user_id')
    .select(['e.id', 'e.row_count', 'e.created_at', 'u.display_name', 'u.email']).orderBy('e.created_at', 'desc').limit(200).execute()
  return { exports: rows }
})
