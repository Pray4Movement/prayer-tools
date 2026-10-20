// Pageviews plus one engagement heartbeat loop per page, handed off on
// client-side navigation so engagement is never double counted.
const HEARTBEAT_MS = 30_000
const HEARTBEAT_PATH = '/api/collect/heartbeat'

export default defineNuxtPlugin((nuxtApp) => {
  if (location.pathname === '/my' || location.pathname.startsWith('/my/')) return
  // The admin editor's preview frame is not a visit.
  if (new URLSearchParams(location.search).has('pt_edit')) return
  // The platform host has no site to count pageviews against.
  if ((nuxtApp.payload.data[`view:${location.pathname}`] as { host?: string } | undefined)?.host === 'platform') return
  const router = useRouter()
  let eventId: string | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let engagedStart: number | null = null
  let engaged = 0
  let visible = document.visibilityState !== 'hidden'
  let lastPath = ''
  let generation = 0

  function flush() {
    if (!eventId) return
    if (visible && engagedStart != null) {
      engaged += (Date.now() - engagedStart) / 1000
      engagedStart = Date.now()
    }
    const value = Math.round(engaged)
    if (value <= 0) return
    const body = JSON.stringify({ event_id: eventId, value })
    try {
      if (navigator.sendBeacon?.(HEARTBEAT_PATH, new Blob([body], { type: 'application/json' }))) return
    } catch {
      // fall back to fetch
    }
    try {
      void fetch(HEARTBEAT_PATH, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true })
    } catch {
      // analytics is non-critical
    }
  }

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
  }

  function start(id: string) {
    stop()
    eventId = id
    engaged = 0
    engagedStart = visible ? Date.now() : null
    timer = setInterval(flush, HEARTBEAT_MS)
  }

  async function pageview(fullPath: string) {
    if (fullPath === lastPath) return
    lastPath = fullPath
    const gen = ++generation
    flush()
    stop()
    eventId = null
    const params = new URLSearchParams(location.search)
    const metadata: Record<string, unknown> = {}
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'r']) {
      const v = params.get(k)
      if (v) metadata[k === 'r' ? 'referral' : k] = v.slice(0, 100)
    }
    const day = location.pathname.match(/\/pray\/(\d+)/)?.[1]
    if (day) metadata.content_day = Number(day)
    try {
      const res = await $fetch<{ id: string | null }>('/api/collect', {
        method: 'POST',
        body: {
          event_type: 'pageview',
          url: safeUrl(),
          referrer: document.referrer || null,
          anonymous_hash: visitorId(),
          language: document.documentElement.lang,
          screen_size: `${window.screen.width}x${window.screen.height}`,
          metadata
        }
      })
      if (gen === generation && res?.id) start(res.id)
    } catch {
      // analytics is non-critical
    }
  }

  nuxtApp.hook('app:mounted', () => void pageview(router.currentRoute.value.fullPath))
  router.afterEach(to => void pageview(to.fullPath))

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (engagedStart != null) engaged += (Date.now() - engagedStart) / 1000
      engagedStart = null
      visible = false
      flush()
    } else {
      visible = true
      engagedStart = Date.now()
    }
  })
  window.addEventListener('pagehide', () => {
    flush()
    stop()
  })
})
