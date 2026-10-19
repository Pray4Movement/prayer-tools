// Mailgun delivery events for platform mail (reminders, transactional, site
// marketing). Hard bounces and complaints go on the global suppression list,
// which every site's sends check; complaints also count against the site's
// marketing complaint rate.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { db } from '#core/server/utils/database'
import { suppress } from '@prayertools/shared/email/suppression'
import { withOrg } from '@prayertools/shared/db/scope'
import { recordEvent } from '@prayertools/shared/stats'

interface MailgunEvent {
  signature?: { timestamp?: string, token?: string, signature?: string }
  'event-data'?: {
    event?: string
    severity?: string
    recipient?: string
    reason?: string
    'delivery-status'?: { description?: string, message?: string }
    'user-variables'?: Record<string, string>
  }
}

function verified(sig: MailgunEvent['signature']): boolean {
  const key = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
  if (!key) return process.env.NODE_ENV === 'development'
  if (!sig?.timestamp || !sig.token || !sig.signature) return false
  if (Math.abs(Date.now() / 1000 - Number(sig.timestamp)) > 15 * 60) return false
  const expected = createHmac('sha256', key).update(sig.timestamp + sig.token).digest()
  const actual = Buffer.from(sig.signature, 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export default defineEventHandler(async (event) => {
  const body = await readBody<MailgunEvent>(event)
  if (!verified(body?.signature)) throw createError({ statusCode: 401, statusMessage: 'Bad signature' })
  const data = body['event-data'] ?? {}
  const recipient = data.recipient
  if (!recipient) return { ok: true }
  const vars = data['user-variables'] ?? {}
  const detail = data['delivery-status']?.description || data['delivery-status']?.message || data.reason || null
  if (data.event === 'failed' && data.severity === 'permanent') {
    await suppress(db as never, recipient, 'hard_bounce', detail, 'mailgun')
  } else if (data.event === 'complained') {
    await suppress(db as never, recipient, 'complaint', detail, 'mailgun')
    if (vars.org_id && /^[0-9a-f-]{36}$/.test(vars.org_id)) {
      await withOrg(db as never, vars.org_id, tx => recordEvent(tx, { campaignId: null, type: 'email_complaint', meta: { stream: vars.stream ?? null, kind: vars.kind ?? null } })).catch(() => {})
    }
  }
  return { ok: true }
})
