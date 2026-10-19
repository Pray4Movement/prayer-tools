<script setup lang="ts">
const { can } = usePtSite()
const items = computed(() => [
  { label: 'Landing page', to: '/site/landing', icon: 'i-lucide-panels-top-left' },
  ...(can('pt.intercessors.read') ? [{ label: 'Stories', to: '/site/landing/stories', icon: 'i-lucide-heart-handshake' }] : []),
  { label: 'Share', to: '/site/landing/share', icon: 'i-lucide-share-2' }
])
</script>

<template>
  <PtSectionTabs :items="items" />
</template>
