<script setup lang="ts">
// A site's settings, team and roles live in the Site app (fixed roles, apps
// every site has); the org settings shell with custom roles, role overrides
// and app switches is not offered to site owners. Covers its child pages too.
definePageMeta({ middleware: 'auth' })
const route = useRoute()
await navigateTo(`/@${route.params.orgSlug}/site/settings`, { replace: true })
</script>

<template>
  <div />
</template>
