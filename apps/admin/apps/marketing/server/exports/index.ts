// `#marketing/server` — the marketing layer's server surface for hosts. Lives
// under server/exports/ so nitro's auto-import scan doesn't see it.
export { registerMarketingHost, getMarketingHost, requireMarketingHost } from '../../lib/registry'
export { processMarketing, COMPLAINT_PAUSE_RATE } from '../../lib/deliver'
export type { ProcessOptions, ProcessResult } from '../../lib/deliver'
export type {
  MarketingHost,
  HostTx,
  MarketingAudience,
  AudienceMember,
  MarketingRecipient,
  MarketingLanguage,
  MarketingSender,
  MarketingVariable,
  MarketingMail,
  ConsentWithdrawal,
  EmailVersion,
  EmailVersions,
  EmailStatus,
  MarketingTables
} from '../../lib/types'
