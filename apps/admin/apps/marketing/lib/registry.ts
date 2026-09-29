// The host registers its implementation once at boot (a Nitro plugin in the
// admin app); session-less callers like the worker pass it to
// `processMarketing` directly.
import type { MarketingHost } from './types'

let _host: MarketingHost | null = null

export function registerMarketingHost(host: MarketingHost): void {
  _host = host
}

export function getMarketingHost(): MarketingHost | null {
  return _host
}

export function requireMarketingHost(): MarketingHost {
  if (!_host) throw Object.assign(new Error('No marketing host is registered.'), { statusCode: 503 })
  return _host
}
