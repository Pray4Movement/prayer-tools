// Code-owned option lists for the admin UI: languages, templates, setup
// options, landing sections, licenses. Labels live in the client.
import { LANGUAGES } from '@prayertools/shared/languages'
import { TEMPLATES, START_MODES, END_MODES, GOALS, CADENCES, DURATION_OPTIONS, DEFAULT_DURATION_MIN, FIXED_MAX_DAYS } from '@prayertools/shared/setup'
import { LANDING_SECTIONS, HIDEABLE_SECTIONS } from '@prayertools/shared/landing'
import { LICENSES } from '@prayertools/shared/content'
import { SITE_SETTING_DEFAULTS } from '@prayertools/shared/site'
import { platformConfig } from '@prayertools/shared/config'

export default defineEventHandler(() => {
  const c = platformConfig()
  return {
    languages: LANGUAGES,
    templates: TEMPLATES,
    setup: { startModes: START_MODES, endModes: END_MODES, goals: GOALS, cadences: CADENCES, durations: DURATION_OPTIONS, defaultDuration: DEFAULT_DURATION_MIN, fixedMaxDays: FIXED_MAX_DAYS },
    landing: { sections: LANDING_SECTIONS, hideable: HIDEABLE_SECTIONS },
    licenses: LICENSES,
    settingDefaults: SITE_SETTING_DEFAULTS,
    siteBaseHost: c.siteBaseHost,
    siteScheme: c.siteScheme,
    donateUrl: c.donateUrl,
    fallbackOrigin: c.cloudflare.fallbackOrigin,
    turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '',
    feedback: c.feedback
  }
})
