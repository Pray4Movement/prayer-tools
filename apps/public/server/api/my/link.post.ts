// "Email me my link": always the same answer; a link is sent only when a
// verified intercessor with that address exists.
import { hashToken, randomToken } from '@prayertools/shared/tokens'
import { normalizeEmail } from '@prayertools/shared/crm'
import { myPrayerEmail } from '@prayertools/shared/email/templates'
import { sendMail } from '@prayertools/shared/email/transport'
import { isSuppressed } from '@prayertools/shared/email/suppression'
import { platformOrigin } from '@prayertools/shared/config'
import { useDb } from '../../utils/db'
import { background, limit, readJson, str } from '../../utils/request'
import { MY_TOKEN_MINUTES } from '../../utils/my'
import { UI_LANGUAGES } from '../../utils/site-data'

export default defineEventHandler(async (event) => {
  limit(event, 'my-link', 5, 60_000)
  limit(event, 'my-link-hour', 20, 3_600_000)
  const body = await readJson(event)
  const { normalized, valid } = normalizeEmail(str(body.email, 254))
  const lang = UI_LANGUAGES.includes(str(body.language, 10)) ? str(body.language, 10) : 'en'
  if (valid) {
    const db = useDb()
    const person = await db
      .selectFrom('pt_intercessor')
      .select(['id', 'email'])
      .where(eb => eb.fn('lower', ['email']), '=', normalized)
      .where('email_verified_at', 'is not', null)
      .executeTakeFirst()
    if (person?.email && !(await isSuppressed(db, person.email))) {
      const token = randomToken(32)
      await db.insertInto('pt_my_token').values({
        intercessor_id: person.id,
        token_hash: hashToken(token),
        expires_at: new Date(Date.now() + MY_TOKEN_MINUTES * 60_000)
      }).execute()
      const mail = myPrayerEmail(lang, `${platformOrigin()}/my/login/${token}`, 0, MY_TOKEN_MINUTES)
      background(event, sendMail({ stream: 'transactional', to: person.email, fromName: 'Prayer.Tools', fromLocal: 'my', subject: mail.subject, html: mail.html, text: mail.text, tags: ['my_link'] }))
    }
  }
  return { ok: true }
})
