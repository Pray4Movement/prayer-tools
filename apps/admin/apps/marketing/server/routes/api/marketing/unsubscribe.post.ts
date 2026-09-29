import { applyUnsubscribe } from '../../../../lib/unsubscribe'

// Public. Takes the page's confirm (JSON `{ token }`) and RFC 8058 one-click
// POSTs from mailbox providers (`?token=` with a `List-Unsubscribe=One-Click`
// form body). One-click always gets a 200 so providers don't retry.
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null) as Record<string, unknown> | string | null
  const fromBody = body && typeof body === 'object' ? body.token : null
  const token = String(getQuery(event).token ?? fromBody ?? '')
  const oneClick = !fromBody
  const host = marketingHost()
  const res = await applyUnsubscribe(host, marketingDb(), token, {
    source: 'marketing-unsubscribe',
    surface: oneClick ? 'email-one-click' : 'email',
    ip: marketingClientIp(event),
    userAgent: getHeader(event, 'user-agent') ?? null
  })
  if (!res && !oneClick) throw createError({ statusCode: 400, statusMessage: 'This unsubscribe link is not valid.' })
  return { ok: true, test: res?.test ?? false, sites: res?.sites.length ?? 0 }
})
