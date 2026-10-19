import { forwardHeartbeat } from '@prayertools/shared/statinator'
import { background, limit, readJson } from '../../utils/request'
import { siteContext } from '../../utils/site-context'
import { sameOrigin } from '../../utils/same-origin'

const MAX_ENGAGED_SECONDS = 2 * 3600

export default defineEventHandler(async (event) => {
  siteContext(event)
  sameOrigin(event)
  limit(event, 'heartbeat', 60, 60_000)
  const body = await readJson(event, 1024)
  const id = typeof body.event_id === 'string' || typeof body.event_id === 'number' ? String(body.event_id).slice(0, 64) : ''
  const value = Number(body.value)
  if (!id || !Number.isFinite(value)) throw createError({ statusCode: 400 })
  background(event, forwardHeartbeat(id, Math.min(Math.max(0, value), MAX_ENGAGED_SECONDS)))
  setResponseStatus(event, 202)
  return { ok: true }
})
