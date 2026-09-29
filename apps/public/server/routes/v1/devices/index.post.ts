// Anonymous device registration: creates an intercessor with no email and a
// per-device credential, returned once and stored hashed.
import { hashToken, randomToken } from '@prayertools/shared/tokens'
import { isValidTimezone } from '@prayertools/shared/dates'
import { useDb } from '../../../utils/db'
import { limit, readJson, str } from '../../../utils/request'

export default defineEventHandler(async (event) => {
  limit(event, 'v1-register', 10, 60_000)
  const body = await readJson(event, 4096)
  const credential = randomToken(32)
  const db = useDb()
  const result = await db.transaction().execute(async (tx) => {
    const person = await tx.insertInto('pt_intercessor').values({ last_active_at: new Date() }).returning('id').executeTakeFirstOrThrow()
    const tz = str(body.timezone, 64)
    const device = await tx.insertInto('pt_intercessor_device').values({
      intercessor_id: person.id,
      credential_hash: hashToken(credential),
      platform: str(body.platform, 20) || null,
      app_version: str(body.app_version, 40) || null,
      push_id: str(body.push_id, 400) || null,
      timezone: isValidTimezone(tz) ? tz : null,
      language: str(body.language, 10) || null
    }).returning('id').executeTakeFirstOrThrow()
    return { device_id: device.id, intercessor_id: person.id }
  })
  setResponseStatus(event, 201)
  return { ...result, credential }
})
