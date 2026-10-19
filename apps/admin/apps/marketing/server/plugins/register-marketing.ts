import { registerPermissions } from '#core/server/utils/permissions-registry'
import { registerDefaultGrants } from '#core/server/utils/default-grants-registry'
import { registerApp } from '#core/server/utils/app-registry'
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
    order: 30
  })
})
