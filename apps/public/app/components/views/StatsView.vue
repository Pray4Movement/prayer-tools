<script setup lang="ts">
import type { StatsView } from '~~/shared/view'

defineProps<{ stats: StatsView }>()
const { site } = useSite()
const { t } = useI18n()
useHead({ title: () => `${t('stats.title')} · ${site.value.name}` })
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-10 space-y-6">
    <h1 class="text-3xl font-bold">{{ t('stats.title') }}</h1>
    <p v-if="site.campaign" class="text-stone-600">{{ site.campaign.name }}</p>
    <StatsGrid :stats="stats" />
  </div>
</template>
