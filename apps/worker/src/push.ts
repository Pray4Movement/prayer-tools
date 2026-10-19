// Push notifications to app devices through the OneSignal REST API, targeting
// the devices' push subscription ids. Unavailable (null) without credentials.
export interface PushMessage {
  pushIds: string[]
  heading: string
  body: string
  data?: Record<string, string>
}

export type PushSender = (msg: PushMessage) => Promise<void>

const MAX_IDS = 2000

export function oneSignalSender(appId = process.env.ONESIGNAL_APP_ID, apiKey = process.env.ONESIGNAL_API_KEY): PushSender | null {
  if (!appId || !apiKey) return null
  return async (msg) => {
    for (let i = 0; i < msg.pushIds.length; i += MAX_IDS) {
      const res = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: { 'authorization': `Key ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          app_id: appId,
          target_channel: 'push',
          include_subscription_ids: msg.pushIds.slice(i, i + MAX_IDS),
          headings: { en: msg.heading },
          contents: { en: msg.body },
          data: msg.data
        }),
        signal: AbortSignal.timeout(20_000)
      })
      if (!res.ok) throw new Error(`OneSignal ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
    }
  }
}
