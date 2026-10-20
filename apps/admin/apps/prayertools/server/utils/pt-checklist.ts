import type { Transaction } from 'kysely'
import type { Database } from '#core/server/database/schema'
import type { SiteLanding, SiteShare, TranslatableText } from '@prayertools/shared/db/schema'
import { pickCurrentCampaign } from '@prayertools/shared/setup'
import { LANGUAGES } from '@prayertools/shared/languages'

export interface PtChecklistItem {
  key: string
  label: string
  done: boolean
  // Publishing waits for required items; the others are recommendations.
  required: boolean
  detail?: string
  // Admin page that fixes it, relative to the site.
  to: string
}

const hasText = (t: TranslatableText | null | undefined) => Object.values(t?.values ?? {}).some(v => !!v?.trim())

// What a site needs before (and soon after) it goes live, for its current campaign.
export async function ptLaunchChecklist(tx: Transaction<Database>): Promise<PtChecklistItem[]> {
  const site = await ptSite(tx)
  const campaigns = (await tx.selectFrom('pt_campaign').selectAll().execute()).map(ptCampaignOut)
  const campaign = pickCurrentCampaign(campaigns)?.campaign ?? campaigns[0] ?? null
  const libraries = campaign ? await ptCampaignLibraries(tx, campaign.id, site.languages) : []
  const entries = libraries.reduce((n, l) => n + l.entryCount, 0)
  const missing = [...new Set(libraries.flatMap(l => l.missingLanguages))]
  const landing = (site.landing ?? {}) as SiteLanding
  const branding = (site.branding ?? {}) as { image_url?: string }
  const identity = (site.email_identity ?? {}) as { from_name?: string, reply_to?: string }
  const datesDone = !!campaign && (campaign.start_mode === 'join' || (!!campaign.start_date && (campaign.end_mode !== 'date' || !!campaign.end_date)))

  return [
    {
      key: 'dates',
      label: campaign?.start_mode === 'join' ? 'Campaign start and length set' : 'Campaign start and end dates set',
      done: datesDone,
      required: true,
      to: campaign ? `/site/campaigns/${campaign.id}` : '/site/campaigns/new'
    },
    {
      key: 'content',
      label: 'Prayer content chosen',
      done: entries > 0,
      required: true,
      detail: entries > 0 ? `${entries} ${entries === 1 ? 'entry' : 'entries'}` : undefined,
      to: '/site/content'
    },
    {
      key: 'content_languages',
      label: 'Prayer content in every site language',
      done: entries > 0 && missing.length === 0,
      required: false,
      detail: missing.length ? `Missing: ${missing.map(l => LANGUAGES.find(x => x.code === l)?.name ?? l).join(', ')}` : undefined,
      to: '/site/content'
    },
    {
      key: 'why',
      label: '"Why this campaign" written',
      done: Object.values(landing.why ?? {}).some(doc => JSON.stringify(doc ?? {}).includes('"text"')),
      required: false,
      to: '/site/landing'
    },
    {
      key: 'description',
      label: 'Short description written',
      done: hasText(site.description as TranslatableText | null),
      required: false,
      to: '/site/landing'
    },
    {
      key: 'image',
      label: 'Top image chosen',
      done: !!branding.image_url,
      required: false,
      to: '/site/settings'
    },
    {
      key: 'email',
      label: 'Email sender name and reply-to',
      done: !!(identity.from_name || identity.reply_to),
      required: false,
      to: '/site/settings'
    },
    {
      key: 'share',
      label: 'Share message written',
      done: hasText((site.share as SiteShare | null)?.messages),
      required: false,
      to: '/site/landing/share'
    }
  ]
}
