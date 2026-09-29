<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <main class="max-w-2xl mx-auto px-4 py-16 space-y-4">
    <h1 class="text-3xl font-bold">{{ t('notfound.title') }}</h1>
    <p><a href="/my" class="underline">{{ t('my.title') }}</a></p>
  </main>
</template>
