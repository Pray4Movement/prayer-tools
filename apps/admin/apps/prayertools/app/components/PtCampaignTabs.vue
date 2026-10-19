<script setup lang="ts">
// A campaign's pages: its overview, and the content, emails and stats pages
// opened for that campaign.
const props = defineProps<{ campaignId: string }>()
const { can } = usePtSite()
const items = computed(() => {
  const query = { campaign: props.campaignId }
  return [
    { label: 'Overview', to: `/site/campaigns/${props.campaignId}`, icon: 'i-lucide-calendar-range' },
    { label: 'Content', to: '/site/content', query, icon: 'i-lucide-book-open' },
    ...(can('pt.email.send') ? [{ label: 'Emails', to: '/marketing/test-emails', query, icon: 'i-lucide-mail-check' }] : []),
    { label: 'Stats', to: '/site/stats', query, icon: 'i-lucide-chart-line' }
  ]
})
</script>

<template>
  <PtSectionTabs :items="items" />
</template>
