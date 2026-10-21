<script setup lang="ts">
// Compact widget for other websites (framed by /embed.js); reports its height
// to the parent page so the iframe can resize.
import type { GoalProgressView } from '~~/shared/view'

defineProps<{ progress: GoalProgressView | null }>()
const { site, link, st, date } = useSite()
const { t } = useI18n()
const root = ref<HTMLElement | null>(null)

onMounted(() => {
  const post = () => window.parent?.postMessage({ type: 'pt-embed-height', height: document.documentElement.scrollHeight }, '*')
  post()
  if (root.value && 'ResizeObserver' in window) new ResizeObserver(post).observe(root.value)
})
</script>

<template>
  <main ref="root" class="p-4 space-y-3 bg-white">
    <p class="font-bold text-lg">{{ site.name }}</p>
    <p v-if="site.campaign?.state === 'upcoming' && site.campaign.startDate" class="text-sm">{{ t('landing.starts_on', { date: date(site.campaign.startDate) }) }}</p>
    <GoalProgress v-if="progress" :progress="progress" />
    <div class="flex flex-wrap gap-2">
      <UButton v-if="site.campaign && (site.campaign.state === 'active' || site.campaign.state === 'upcoming')" :to="site.url + link('signup')" target="_blank" :label="st('landing.signup.title')" />
      <UButton v-if="site.campaign?.goal === 'coverage'" :to="site.url + link('coverage')" target="_blank" variant="outline" :label="t('nav.coverage')" />
      <UButton v-else-if="site.campaign?.state !== 'upcoming'" :to="site.url + link('pray')" target="_blank" variant="outline" :label="t('landing.pray_today')" />
    </div>
  </main>
</template>
