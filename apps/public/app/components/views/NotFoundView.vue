<script setup lang="ts">
const { site, link } = useSite()
const { t } = useI18n()
useHead({ title: () => `${t('notfound.title')} · ${site.value.name}` })
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-16 space-y-4">
    <h1 class="text-3xl font-bold">{{ t('notfound.title') }}</h1>
    <p class="text-stone-700">{{ t('notfound.body') }}</p>
    <UButton :to="link('', [], { current: true })" :label="t('notfound.home')" />
  </div>
</template>
