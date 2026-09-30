<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { data: site, can } = usePtSite()
const { data: campaigns } = useFetch<{ campaigns: { id: string, name: string }[] }>('/api/pt/campaigns', { key: 'pt-campaigns' })
const campaignId = ref<string | undefined>()
watch([campaigns, site], () => { if (!campaignId.value) campaignId.value = site.value?.currentCampaign?.id ?? campaigns.value?.campaigns[0]?.id }, { immediate: true })

const { data } = useFetch<{
  totals: Record<string, number>
  series: { day: string, metric: string, value: number }[]
  dims: Record<string, { key: string, total: number }[]>
  progress: { goal: string, people: number, value: number, target: number | null, percent: number | null } | null
  coverage: { date: string, percent: number }[] | null
  commitments: number
  prayingNow: number
  anonymousApp: number
}>('/api/pt/stats', { query: computed(() => ({ campaign: campaignId.value })), key: computed(() => `pt-stats-${campaignId.value}`), watch: [campaignId] })

const cards = computed(() => {
  const t = data.value?.totals ?? {}
  return [
    { label: 'People signed up', value: data.value?.progress?.people ?? 0 },
    { label: 'Prayer times', value: data.value?.commitments ?? 0 },
    { label: 'Prayers', value: t.prayers ?? 0 },
    { label: 'Minutes prayed', value: Math.round((t.prayer_seconds ?? 0) / 60) },
    { label: 'Praying now', value: data.value?.prayingNow ?? 0 },
    { label: 'Anonymous app users', value: data.value?.anonymousApp ?? 0 },
    { label: 'Visitors', value: t.visitors ?? 0 },
    { label: 'Signups', value: t.signups ?? 0 },
    { label: 'Confirmed emails', value: t.verifications ?? 0 },
    { label: 'Joined through shares', value: t.share_signups ?? 0 },
    { label: 'Shares', value: t.shares ?? 0 },
    { label: 'Praying as a group', value: t.group_prayers ?? 0 },
    { label: 'Stories', value: t.stories ?? 0 }
  ]
})

const METRICS = [
  { key: 'prayers', label: 'Prayers' },
  { key: 'visitors', label: 'Visitors' },
  { key: 'signups', label: 'Signups' }
]
const metric = ref('prayers')
const days = computed(() => {
  const rows = (data.value?.series ?? []).filter(s => s.metric === metric.value)
  const max = Math.max(1, ...rows.map(r => r.value))
  return rows.slice(-60).map(r => ({ ...r, height: Math.max(2, Math.round(r.value / max * 100)) }))
})

async function downloadIntercessors() {
  const res = await $fetch.raw<Blob>('/api/pt/export.csv', { responseType: 'blob' })
  const url = URL.createObjectURL(res._data!)
  const a = document.createElement('a')
  a.href = url
  a.download = `${site.value?.org.slug}-intercessors.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const DIM_LABELS: Record<string, string> = { country: 'Countries', source: 'Sources', utm_source: 'Campaign sources (UTM)', referrer: 'Referring sites' }
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">
        Stats
      </h1>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="can('pt.intercessors.export')"
          icon="i-lucide-download"
          variant="outline"
          label="Export intercessors"
          @click="downloadIntercessors"
        />
        <USelect
          v-if="campaigns?.campaigns.length"
          v-model="campaignId"
          :items="campaigns.campaigns.map(c => ({ label: c.name, value: c.id }))"
          class="w-64"
        />
      </div>
    </div>

    <UCard v-if="data?.progress">
      <p class="text-sm text-(--ui-text-muted)">
        Goal: {{ PT_LABELS.goal[data.progress.goal] }}
      </p>
      <p class="text-lg font-semibold">
        <template v-if="data.progress.goal === 'people'">
          {{ data.progress.people.toLocaleString() }} people<span v-if="data.progress.target"> of {{ data.progress.target.toLocaleString() }}</span>
        </template>
        <template v-else-if="data.progress.goal === 'prayer_time'">
          {{ (data.progress.value / 60).toFixed(1) }} hours of prayer a day committed, of {{ ((data.progress.target ?? 1440) / 60).toFixed(0) }}
        </template>
        <template v-else>
          {{ data.progress.value }}% of the time covered
        </template>
      </p>
      <UProgress
        v-if="data.progress.percent !== null"
        :model-value="data.progress.percent"
        class="mt-2"
      />
    </UCard>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <UCard
        v-for="c in cards"
        :key="c.label"
      >
        <p class="text-xs text-(--ui-text-muted)">
          {{ c.label }}
        </p>
        <p class="text-2xl font-semibold tabular-nums">
          {{ c.value.toLocaleString() }}
        </p>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">
            By day
          </h2>
          <UTabs
            v-model="metric"
            :items="METRICS.map(m => ({ label: m.label, value: m.key }))"
            :content="false"
            size="xs"
          />
        </div>
      </template>
      <div
        v-if="days.length"
        class="flex items-end gap-0.5 h-40"
        role="img"
        :aria-label="`${metric} per day`"
      >
        <div
          v-for="d in days"
          :key="d.day"
          class="flex-1 bg-(--ui-primary) rounded-t-sm min-w-0.5"
          :style="{ height: `${d.height}%` }"
          :title="`${d.day}: ${d.value}`"
        />
      </div>
      <p
        v-else
        class="text-sm text-(--ui-text-muted)"
      >
        No activity yet.
      </p>
    </UCard>

    <UCard v-if="data?.coverage?.length">
      <template #header>
        <h2 class="font-semibold">
          24/7 coverage by day
        </h2>
      </template>
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="d in data.coverage"
          :key="d.date"
          class="rounded p-1 text-center text-xs"
          :class="d.percent >= 100 ? 'bg-(--ui-success)/30' : d.percent > 0 ? 'bg-(--ui-warning)/20' : 'bg-(--ui-bg-elevated)'"
        >
          <p>{{ ptFormatDate(d.date, { month: 'short', day: 'numeric' }) }}</p>
          <p class="font-semibold">
            {{ d.percent }}%
          </p>
        </div>
      </div>
    </UCard>

    <div class="grid md:grid-cols-2 gap-4">
      <UCard
        v-for="(rows, dim) in data?.dims ?? {}"
        :key="dim"
      >
        <template #header>
          <h2 class="font-semibold">
            {{ DIM_LABELS[dim] ?? dim }}
          </h2>
        </template>
        <ul class="text-sm space-y-1">
          <li
            v-for="r in rows"
            :key="r.key"
            class="flex justify-between"
          >
            <span>{{ r.key }}</span>
            <span class="tabular-nums">{{ r.total.toLocaleString() }}</span>
          </li>
        </ul>
      </UCard>
    </div>
  </div>
</template>
