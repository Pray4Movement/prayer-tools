// Publish, archive, un-archive. Publishing requires at least one campaign.
import { jsonb } from '@prayertools/shared/db/json'

export default definePtHandler('pt.site.manage', async (event, tx, ctx) => {
  const { action } = await ptBody<{ action?: string }>(event)
  const site = await ptSite(tx)
  const now = new Date()
  if (action === 'publish') {
    const campaign = await tx.selectFrom('pt_campaign').select('id').executeTakeFirst()
    if (!campaign) ptBadRequest('Add a campaign before publishing.')
    await tx.updateTable('pt_site').set({ status: 'published', published_at: site.published_at ?? now, archived_at: null, onboarding: jsonb({ ...(site.onboarding as object), completed: true }), updated_at: now }).where('org_id', '=', ctx.orgId).execute()
  } else if (action === 'archive') {
    await tx.updateTable('pt_site').set({ status: 'archived', archived_at: now, updated_at: now }).where('org_id', '=', ctx.orgId).execute()
    await tx.updateTable('pt_directory_entry').set({ status: 'unlisted', updated_at: now }).where('org_id', '=', ctx.orgId).execute()
  } else if (action === 'unarchive' || action === 'unpublish') {
    await tx.updateTable('pt_site').set({ status: action === 'unarchive' && site.published_at ? 'published' : 'draft', archived_at: null, updated_at: now }).where('org_id', '=', ctx.orgId).execute()
  } else {
    ptBadRequest('Unknown action.')
  }
  const updated = await tx.selectFrom('pt_site').select('status').executeTakeFirstOrThrow()
  return { status: updated.status }
})
