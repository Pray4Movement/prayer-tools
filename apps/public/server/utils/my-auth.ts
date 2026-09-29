// My prayer sign-in: a single-use emailed token exchanged for a session
// cookie on the platform host. Both are stored hashed.
import type { H3Event } from 'h3'
import { hashToken, randomToken } from '@prayertools/shared/tokens'
import { useDb } from './db'
import { setMyCookie } from './cookies'
import { MY_SESSION_DAYS } from './my'

export async function exchangeMyToken(event: H3Event, token: string) {
  const db = useDb()
  const now = new Date()
  const used = await db
    .updateTable('pt_my_token')
    .set({ used_at: now })
    .where('token_hash', '=', hashToken(token))
    .where('used_at', 'is', null)
    .where('expires_at', '>', now)
    .returning('intercessor_id')
    .executeTakeFirst()
  if (!used) return sendRedirect(event, '/my?notice=link_invalid', 302)
  const session = randomToken(32)
  await db.insertInto('pt_my_session').values({
    intercessor_id: used.intercessor_id,
    token_hash: hashToken(session),
    expires_at: new Date(now.getTime() + MY_SESSION_DAYS * 86_400_000)
  }).execute()
  setMyCookie(event, session, MY_SESSION_DAYS * 86_400)
  return sendRedirect(event, '/my', 302)
}
