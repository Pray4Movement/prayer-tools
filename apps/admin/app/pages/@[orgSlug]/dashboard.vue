<script setup lang="ts">
// A site's home is its dashboard in the Site app, not the app launcher.
definePageMeta({
  middleware: 'auth',
  redirect: to => ({ path: `/@${to.params.orgSlug}/site`, query: to.query })
})
</script>

<template>
  <div />
</template>
