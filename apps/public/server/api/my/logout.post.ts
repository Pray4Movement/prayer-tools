import { hashToken } from '@prayertools/shared/tokens'
import { useDb } from '../../utils/db'
import { MY_COOKIE, clearMyCookie } from '../../utils/cookies'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, MY_COOKIE)
  if (token) await useDb().updateTable('pt_my_session').set({ revoked_at: new Date() }).where('token_hash', '=', hashToken(token)).execute()
  clearMyCookie(event)
  return { ok: true }
})
