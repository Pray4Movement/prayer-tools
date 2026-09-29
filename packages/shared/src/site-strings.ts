// Public UI strings a site may reword per language (stored in pt_site_string
// as overrides over the public server's i18n defaults).
export const EDITABLE_SITE_STRINGS = [
  'landing.how.title', 'landing.how.body', 'landing.signup.title', 'landing.signup.intro', 'landing.share.title',
  'landing.contact.title', 'landing.why.title', 'landing.stories.title', 'landing.today.title', 'share.default_message',
  'signup.success', 'between.notify_intro'
] as const

export type EditableSiteString = typeof EDITABLE_SITE_STRINGS[number]
