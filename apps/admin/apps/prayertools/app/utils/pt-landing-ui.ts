// Landing page editor copy: what each fixed section shows, its icon, and the
// guidance a campaign template gives for the champion's own "why" text.

export const PT_LANDING_SECTION_INFO: Record<string, { title: string, description: string, icon: string }> = {
  top: { title: 'Top of the page', description: 'Site name, top image, people count or goal progress, and the signup button.', icon: 'i-lucide-panel-top' },
  why: { title: 'Why this campaign', description: 'Your own words about why people should pray.', icon: 'i-lucide-message-square-quote' },
  custom: { title: 'Your sections', description: 'Extra sections you add, each with a heading, text, image and button.', icon: 'i-lucide-layout-list' },
  stories: { title: 'Stories', description: 'Stories from people who prayed, ones you publish from the Stories page.', icon: 'i-lucide-heart-handshake' },
  how: { title: 'How it works', description: 'Explains signing up, reminders and praying, written for your campaign\'s setup.', icon: 'i-lucide-list-checks' },
  signup: { title: 'Sign up', description: 'The signup form.', icon: 'i-lucide-user-plus' },
  today: { title: 'Today\'s prayer', description: 'A preview of today\'s prayer content.', icon: 'i-lucide-book-open' },
  share: { title: 'Share', description: 'Invites visitors to share the campaign.', icon: 'i-lucide-share-2' },
  contact: { title: 'Contact', description: 'A link to your contact form.', icon: 'i-lucide-mail' },
  app: { title: 'Mobile app', description: 'A link to the Prayer.Tools app, shown once the app is available.', icon: 'i-lucide-smartphone' }
}

export function ptLandingSectionInfo(key: string) {
  return PT_LANDING_SECTION_INFO[key] ?? { title: PT_LABELS.landingSection[key] ?? key, description: '', icon: 'i-lucide-square' }
}

const GUIDANCE: Record<string, Record<string, string>> = {
  why: {
    generic: 'Tell visitors what you are praying for and why it matters. Two or three short paragraphs work well: who or what you pray for, what you hope God will do, and why each person\'s prayer counts.',
    ramadan: 'During Ramadan many Muslims seek God. Share why you are praying for them this month, what you hope for, and how praying 15 minutes a day makes a difference.',
    disaster_4: 'Say briefly what happened, who is affected, and what you are asking God for in these first days. Keep it short: people should be able to start praying right away.',
    disaster_12: 'Describe the needs as the response continues: people affected, those helping, and the churches serving. Invite visitors to keep praying for the next days.',
    demo: 'Explain what a prayer campaign is and invite visitors to try it for a few days before starting their own.'
  }
}

export function ptLandingGuidance(key: string, template: string | null | undefined): string | null {
  return GUIDANCE[key]?.[template ?? 'generic'] ?? GUIDANCE[key]?.generic ?? null
}
