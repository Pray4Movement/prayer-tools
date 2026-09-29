<script setup lang="ts">
const { site } = useSite()
const { t } = useI18n()
useHead({ title: () => site.value.name })
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-16 space-y-4 text-center">
    <h1 class="text-3xl font-bold">{{ site.name }}</h1>
    <p class="text-lg text-stone-700">{{ t('archived.body') }}</p>
    <p><a href="https://prayer.tools" class="underline">{{ t('archived.more') }}</a></p>
  </div>
</template>
