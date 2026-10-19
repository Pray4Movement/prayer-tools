<script setup lang="ts">
const { can } = usePtSite()
const items = computed(() => [
  { label: 'Settings', to: '/site/settings', icon: 'i-lucide-settings' },
  ...(can('pt.site.manage') ? [{ label: 'Domains', to: '/site/settings/domains', icon: 'i-lucide-globe' }] : [])
])
</script>

<template>
  <PtSectionTabs :items="items" />
</template>
