// Adds the prayer.tools panel to CRM contact pages.
import { registerCrmDetailPanel } from '#crm'
import PtSubscriptionPanel from '../components/PtSubscriptionPanel.vue'

export default defineNuxtPlugin(() => {
  registerCrmDetailPanel({
    id: 'pt-subscription',
    recordTypes: ['contacts'],
    component: PtSubscriptionPanel,
    order: 10
  })
})
