<script setup lang="ts">
// A site's home is its dashboard.
definePageMeta({ middleware: 'auth' })
const route = useRoute()
await navigateTo(`/@${route.params.orgSlug}/site`, { replace: true })
</script>

<template>
  <div />
</template>
