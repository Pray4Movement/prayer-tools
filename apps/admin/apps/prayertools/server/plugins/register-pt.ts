import { registerPermissions } from '#core/server/utils/permissions-registry'
import { registerDefaultGrants } from '#core/server/utils/default-grants-registry'
import { registerStaticRole } from '#core/server/utils/roles-registry'
import { registerApp } from '#core/server/utils/app-registry'
import { registerNavItem } from '#core/server/utils/nav-registry'
import { registerAdminSection } from '#core/server/utils/admin-section-registry'
import { registerCrmConsentPurpose } from '#crm/server'
import { registerAiFeature } from '#ai/server'
import { PT_PERMISSIONS, PT_PERMISSION_META, PT_STATIC_ROLES } from '../../app/utils/pt-permissions'

export default defineNitroPlugin(() => {
  registerPermissions(PT_PERMISSIONS, PT_PERMISSION_META)
  registerDefaultGrants('pt', {
    member: ['pt.access', 'pt.site.read', 'pt.stats.read'],
    admin: [...PT_PERMISSIONS]
  })
  for (const role of PT_STATIC_ROLES) {
    registerStaticRole({ ...role, source: 'pt' })
  }

  registerApp({ id: 'site', title: 'Site', path: '/@:orgSlug/site', icon: 'i-lucide-church', requiredPermission: 'pt.access', order: 1 })

  const nav: [string, string, string, string, number][] = [
    ['Dashboard', '/@:orgSlug/site', 'i-lucide-layout-dashboard', 'pt.access', 10],
    ['Campaigns', '/@:orgSlug/site/campaigns', 'i-lucide-calendar-range', 'pt.site.read', 20],
    ['Prayer content', '/@:orgSlug/site/content', 'i-lucide-book-open', 'pt.site.read', 30],
    ['Landing page', '/@:orgSlug/site/landing', 'i-lucide-panels-top-left', 'pt.site.read', 40],
    ['Intercessors', '/@:orgSlug/crm/contacts', 'i-lucide-users', 'crm.contacts.read', 50],
    ['Stats', '/@:orgSlug/site/stats', 'i-lucide-chart-line', 'pt.stats.read', 60],
    ['Stories', '/@:orgSlug/site/stories', 'i-lucide-heart-handshake', 'pt.intercessors.read', 65],
    ['Share', '/@:orgSlug/site/share', 'i-lucide-share-2', 'pt.site.read', 70],
    ['Test emails & push', '/@:orgSlug/site/emails', 'i-lucide-mail-check', 'pt.email.send', 75],
    ['Settings', '/@:orgSlug/site/settings', 'i-lucide-settings', 'pt.site.read', 80],
    ['Domains', '/@:orgSlug/site/domains', 'i-lucide-globe', 'pt.site.manage', 85],
    ['Team', '/@:orgSlug/site/team', 'i-lucide-user-cog', 'org.members.read', 90]
  ]
  for (const [title, path, icon, requiredPermission, order] of nav) {
    registerNavItem({ appId: 'site', title, path, icon, requiredPermission, order })
  }

  registerAdminSection({ appId: 'pt', title: 'Sites', path: '/admin/pt/sites', icon: 'i-lucide-church', order: 20 })
  registerAdminSection({ appId: 'pt', title: 'Directory', path: '/admin/pt/directory', icon: 'i-lucide-list-checks', order: 21 })
  registerAdminSection({ appId: 'pt', title: 'Libraries', path: '/admin/pt/libraries', icon: 'i-lucide-library', order: 22 })
  registerAdminSection({ appId: 'pt', title: 'Stories', path: '/admin/pt/stories', icon: 'i-lucide-heart-handshake', order: 23 })
  registerAdminSection({ appId: 'pt', title: 'Reports', path: '/admin/pt/reports', icon: 'i-lucide-flag', order: 24 })
  registerAdminSection({ appId: 'pt', title: 'Jobs', path: '/admin/pt/jobs', icon: 'i-lucide-list-restart', order: 25 })
  registerAdminSection({ appId: 'pt', title: 'Exports', path: '/admin/pt/exports', icon: 'i-lucide-file-down', order: 26 })

  registerCrmConsentPurpose('site_updates', { title: 'Updates from this site', description: 'Campaign news and relaunch invitations from this site.' })
  registerCrmConsentPurpose('platform_news', { title: 'News from Prayer.Tools', description: 'Platform news, held in the staff org.' })

  registerAiFeature({ key: 'pt.translate', label: 'Prayer.Tools — translate content and site text' })
})
