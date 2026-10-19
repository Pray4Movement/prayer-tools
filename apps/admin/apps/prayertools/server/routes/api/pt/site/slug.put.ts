// Changes the site's address ({slug}.prayer.tools). Old links on the previous
// subdomain stop working, so the UI asks for confirmation.
import { slugError } from '@prayertools/shared/config'
import { containsBlockedWord } from '@prayertools/shared/moderation'

export default definePtHandler('pt.site.manage', async (event, tx, ctx) => {
  const { slug } = await ptBody<{ slug?: string }>(event)
  const s = String(slug ?? '').trim().toLowerCase()
  const err = slugError(s)
  if (err || containsBlockedWord(s)) ptBadRequest(err === 'reserved' ? 'This address is reserved.' : 'Use 3–40 lowercase letters, digits and single hyphens.')
  if (s === ctx.orgSlug) return { slug: s }
  const taken = await tx.selectFrom('orgs').select('id').where('slug', '=', s).executeTakeFirst()
  if (taken) throw createError({ statusCode: 409, statusMessage: 'That address is already taken.' })
  await tx.updateTable('orgs').set({ slug: s, updated_at: new Date().toISOString() }).where('id', '=', ctx.orgId).execute()
  await tx.updateTable('pt_directory_entry').set({ slug: s }).where('org_id', '=', ctx.orgId).execute()
  return { slug: s }
})
