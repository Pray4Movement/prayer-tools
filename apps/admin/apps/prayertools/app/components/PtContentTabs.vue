<script setup lang="ts">
const items = [
  { label: 'Prayer content', to: '/site/content', icon: 'i-lucide-book-open' },
  { label: 'Libraries', to: '/libraries', icon: 'i-lucide-library', exempt: true }
]
</script>

<template>
  <PtSectionTabs :items="items" />
</template>
