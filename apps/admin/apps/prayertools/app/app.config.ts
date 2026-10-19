export default defineAppConfig({
  orgSwitcher: {
    title: 'Sites',
    choose: 'Choose a site',
    empty: 'You don\'t have any sites yet.',
    newLabel: 'New site'
  },
  // Champions use the CRM's contacts, never its schema builder or permissions.
  crm: {
    schemaAdmin: false
  },
  marketing: {
    tabs: [{ label: 'Test emails & push', to: '/marketing/test-emails', icon: 'i-lucide-mail-check' }]
  }
})
