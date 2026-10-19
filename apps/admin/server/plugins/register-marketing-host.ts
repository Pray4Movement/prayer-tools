// prayer.tools is the marketing layer's host: audiences, branding, consent and
// sending come from the shared adapter.
import { registerMarketingHost } from '#marketing/server'
import { ptMarketingHost } from '@prayertools/shared/marketing-host'

export default defineNitroPlugin(() => {
  registerMarketingHost(ptMarketingHost)
})
