import type { Transaction } from 'kysely'
import type { Database } from '#core/server/database/schema'
import { applyTemplate, campaignsOverlap, validateSetup, type SetupAnswers } from '@prayertools/shared/setup'
import { campaignSlugError } from '@prayertools/shared/paths'
import { isValidTimezone } from '@prayertools/shared/dates'
import { parseText } from '@prayertools/shared/translatable'

export function ptSetupFromBody(b: Record<string, unknown>, templateKey: string, base?: Partial<SetupAnswers>): SetupAnswers {
  const chosen: Partial<SetupAnswers> = { ...base }
  for (const k of ['start_mode', 'start_date', 'end_mode', 'end_date', 'length_days', 'goal', 'cadence', 'track_time'] as const) {
    if (k in b) (chosen as Record<string, unknown>)[k] = b[k]
  }
  const answers = applyTemplate(templateKey, chosen)
  const errors = validateSetup(answers)
  if (errors.length) ptBadRequest('Please check the campaign setup.', { errors })
  return answers
}

export async function ptAssertNoOverlap(tx: Transaction<Database>, answers: SetupAnswers & { timezone: string }, exceptId?: string) {
  let q = tx.selectFrom('pt_campaign').selectAll().where('ended_at', 'is', null)
  if (exceptId) q = q.where('id', '!=', exceptId)
  const others = (await q.execute()).map(ptCampaignOut)
  const clash = others.find(o => campaignsOverlap(answers, o))
  if (clash) ptBadRequest(`These dates overlap "${clash.name}". A site runs one campaign at a time.`)
}

export function ptCampaignExtras(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  if (typeof b.name === 'string') {
    const name = b.name.trim()
    if (name.length < 2 || name.length > 120) ptBadRequest('Campaign name must be 2–120 characters.')
    out.name = name
  }
  if (typeof b.slug === 'string' && b.slug) {
    if (campaignSlugError(b.slug)) ptBadRequest('The campaign address may use lowercase letters, digits and hyphens, and cannot be a page name or language code.')
    out.slug = b.slug
  }
  if ('timezone' in b && b.timezone) {
    if (!isValidTimezone(b.timezone)) ptBadRequest('Unknown timezone.')
    out.timezone = b.timezone
  }
  if ('goal_target' in b) {
    const v = b.goal_target
    if (v !== null && !(Number.isInteger(v) && (v as number) > 0 && (v as number) < 10_000_000)) ptBadRequest('Goal target must be a positive whole number.')
    out.goal_target = v
  }
  return out
}

export function ptCta(input: unknown) {
  const c = (input ?? {}) as Record<string, unknown>
  const url = typeof c.url === 'string' && /^https?:\/\//.test(c.url) ? c.url.slice(0, 2000) : undefined
  const label = parseText(c.label) ?? undefined
  return url && label ? { url, label } : {}
}
