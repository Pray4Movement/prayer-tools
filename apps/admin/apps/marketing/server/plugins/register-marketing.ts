import { registerPermissions } from '#core/server/utils/permissions-registry'
import { registerDefaultGrants } from '#core/server/utils/default-grants-registry'
import { registerApp } from '#core/server/utils/app-registry'
import { registerNavItem } from '#core/server/utils/nav-registry'
import { MARKETING_PERMISSIONS, MARKETING_PERMISSION_META, MARKETING_DEFAULT_GRANTS } from '../../app/utils/marketing-permissions'

export default defineNitroPlugin(() => {
  registerPermissions(MARKETING_PERMISSIONS, MARKETING_PERMISSION_META)
  registerDefaultGrants('marketing', MARKETING_DEFAULT_GRANTS)

  registerApp({
    id: 'marketing',
    title: 'Site email',
    path: '/marketing',
    icon: 'i-lucide-mail',
    requiredPermission: 'marketing.access',
    defaultStatus: 'host_controlled',
    shellSidebar: true,
    order: 30
  })
  registerNavItem({ appId: 'marketing', title: 'Emails', path: '/marketing', icon: 'i-lucide-mails', requiredPermission: 'marketing.access', order: 10 })
  registerNavItem({ appId: 'marketing', title: 'Templates', path: '/marketing/templates', icon: 'i-lucide-layout-template', requiredPermission: 'marketing.send', order: 20 })
  registerNavItem({ appId: 'marketing', title: 'Send to several sites', path: '/marketing/multi', icon: 'i-lucide-send', requiredPermission: 'marketing.send', order: 30 })
})
