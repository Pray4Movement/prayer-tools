<script setup lang="ts">
// Tabs of the site email section: the email list, plus pages the host adds
// through app config `marketing.tabs: [{ label, to, icon? }]` (paths without
// the site prefix).
import { useActiveOrg } from '#tenant'

const appConfig = useAppConfig() as { marketing?: { tabs?: { label: string, to: string, icon?: string }[] } }
const route = useRoute()
const { slug } = useActiveOrg()

const links = computed(() => [
  { label: 'Emails', to: '/marketing', icon: 'i-lucide-mails' },
  ...(appConfig.marketing?.tabs ?? [])
].map((t) => {
  const path = slug.value ? `/@${slug.value}${t.to}` : t.to
  return { label: t.label, icon: t.icon, to: path, active: route.path === path }
}))
</script>

<template>
  <UNavigationMenu
    :items="links"
    highlight
    class="border-b border-(--ui-border)"
  />
</template>
