<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface CampaignRow {
  id: string
  slug: string
  name: string
  start_mode: string
  start_date: string | null
  end_date: string | null
  goal: string
  status: string
  length: string
  progress: { people: number, percent: number | null }
}

const { can } = usePtSite()
const { data, status } = useFetch<{ campaigns: CampaignRow[] }>('/api/pt/campaigns', { key: 'pt-campaigns' })
const latestEnded = computed(() => data.value?.campaigns.find(c => c.status === 'ended'))
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Campaigns
        </h1>
        <p class="text-sm text-(--ui-text-muted)">
          Each run of your site. Past campaigns stay online with their results.
        </p>
      </div>
      <div
        v-if="can('pt.campaigns.write')"
        class="flex gap-2"
      >
        <UButton
          v-if="latestEnded"
          :to="`/site/campaigns/new?relaunch=${latestEnded.id}`"
          icon="i-lucide-refresh-cw"
          variant="soft"
          :label="`Relaunch ${latestEnded.name}`"
        />
        <UButton
          to="/site/campaigns/new"
          icon="i-lucide-plus"
          label="New campaign"
        />
      </div>
    </div>
    <div
      v-if="status === 'pending'"
      class="text-sm text-(--ui-text-muted)"
    >
      Loading…
    </div>
    <UCard
      v-else-if="!data?.campaigns.length"
      :ui="{ body: 'text-center space-y-3 py-8' }"
    >
      <p>No campaigns yet.</p>
      <UButton
        to="/site/campaigns/new"
        label="Create the first campaign"
      />
    </UCard>
    <div
      v-else
      class="space-y-3"
    >
      <NuxtLink
        v-for="c in data.campaigns"
        :key="c.id"
        :to="`/site/campaigns/${c.id}`"
        class="block rounded-lg border border-(--ui-border) p-4 hover:bg-(--ui-bg-elevated) transition"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="font-semibold">
              {{ c.name }}
              <span class="text-xs font-normal text-(--ui-text-muted)">/{{ c.slug }}</span>
            </p>
            <p class="text-sm text-(--ui-text-muted)">
              <template v-if="c.start_mode === 'join'">
                Personal start
              </template>
              <template v-else>
                {{ ptFormatDate(c.start_date) }} – {{ c.end_date ? ptFormatDate(c.end_date) : 'no end' }}
              </template>
              · {{ PT_LABELS.goal[c.goal] }} · {{ PT_LABELS.length[c.length] }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm">{{ c.progress.people.toLocaleString() }} people</span>
            <UBadge
              :label="PT_LABELS.campaignStatus[c.status]"
              :color="ptStatusColor(c.status)"
              variant="subtle"
            />
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
