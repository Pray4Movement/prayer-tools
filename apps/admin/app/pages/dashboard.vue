<script setup lang="ts">
// Without a site in view, home is Your sites.
definePageMeta({
  middleware: 'auth',
  redirect: '/orgs'
})
</script>

<template>
  <div />
</template>
