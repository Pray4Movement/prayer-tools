import { requireAuth } from '#core/server/utils/auth'
import { slugError, slugify } from '@prayertools/shared/config'
import { containsBlockedWord } from '@prayertools/shared/moderation'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const q = getQuery(event)
  const slug = typeof q.slug === 'string' ? q.slug.trim().toLowerCase() : slugify(String(q.name ?? ''))
  const err = slugError(slug) ?? (containsBlockedWord(slug) ? 'blocked' : null)
  if (err) return { slug, available: false, reason: err }
  const taken = await ptSlugTaken(slug)
  if (!taken) return { slug, available: true }
  for (let i = 2; i < 50; i++) {
    const candidate = `${slug.slice(0, 36)}-${i}`
    if (!(await ptSlugTaken(candidate))) return { slug, available: false, reason: 'taken', suggestion: candidate }
  }
  return { slug, available: false, reason: 'taken' }
})
