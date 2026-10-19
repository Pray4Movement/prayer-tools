<script setup lang="ts">
const items = [
  { label: 'Images and blocks', to: '/personal', icon: 'i-lucide-images', exempt: true },
  { label: 'Templates', to: '/personal/templates', icon: 'i-lucide-layout-template', exempt: true }
]
</script>

<template>
  <PtSectionTabs :items="items" />
</template>
