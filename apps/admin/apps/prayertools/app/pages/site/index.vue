<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { data: site, error, can, slug } = usePtSite()
const { data: meta } = usePtMeta()
const campaignId = computed(() => site.value?.currentCampaign?.id)
const { data: stats } = useFetch<{ totals: Record<string, number>, progress: { goal: string, people: number, value: number, target: number | null, percent: number | null } | null, prayingNow: number, commitments: number }>('/api/pt/stats', {
  query: computed(() => ({ campaign: campaignId.value })),
  key: computed(() => `pt-dash-stats-${slug.value}-${campaignId.value}`)
})
const notASite = computed(() => (error.value as { statusCode?: number } | null)?.statusCode === 404)

const progressLabel = computed(() => {
  const p = stats.value?.progress
  if (!p) return null
  if (p.goal === 'people') return p.target ? `${p.people.toLocaleString()} of ${p.target.toLocaleString()} people` : `${p.people.toLocaleString()} people praying`
  if (p.goal === 'prayer_time') return `${Math.round(p.value / 60 * 10) / 10} of ${Math.round((p.target ?? 1440) / 60)} hours of prayer a day`
  return `${p.value}% of the time covered`
})
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <UCard v-if="notASite">
      <p class="text-sm">
        This organization isn't a prayer campaign site.
      </p>
      <UButton
        class="mt-3"
        :to="`/@${slug}/crm`"
        label="Open the CRM"
      />
    </UCard>

    <template v-else-if="site">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-semibold">
              {{ site.org.name }}
            </h1>
            <UBadge
              :label="PT_LABELS.siteStatus[site.site.status]"
              :color="ptStatusColor(site.site.status)"
              variant="subtle"
            />
          </div>
          <a
            :href="site.url"
            target="_blank"
            rel="noopener"
            class="text-sm text-(--ui-text-muted) hover:underline"
          >{{ site.url.replace(/^https?:\/\//, '') }}</a>
        </div>
        <div class="flex gap-2">
          <UButton
            v-if="site.site.status === 'draft'"
            to="/site/setup"
            icon="i-lucide-list-checks"
            label="Continue setup"
          />
          <UButton
            v-else
            :href="site.url"
            target="_blank"
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
            label="View site"
          />
          <UButton
            v-if="site.site.status === 'published'"
            to="/site/landing/share"
            icon="i-lucide-share-2"
            label="Share"
          />
        </div>
      </div>

      <div class="grid md:grid-cols-3 gap-4">
        <UCard class="md:col-span-2">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">
                {{ site.currentCampaign?.name ?? 'No campaign yet' }}
              </h2>
              <UBadge
                v-if="site.currentCampaign"
                :label="PT_LABELS.campaignState[site.currentCampaign.state]"
                variant="soft"
              />
            </div>
          </template>
          <div
            v-if="site.currentCampaign"
            class="space-y-4"
          >
            <p class="text-sm text-(--ui-text-muted)">
              {{ PT_LABELS.goal[site.currentCampaign.goal] }} ·
              <template v-if="site.currentCampaign.start_mode === 'join'">
                Each person starts when they join
              </template>
              <template v-else>
                {{ ptFormatDate(site.currentCampaign.start_date) }} – {{ site.currentCampaign.end_date ? ptFormatDate(site.currentCampaign.end_date) : 'no end' }}
              </template>
            </p>
            <div v-if="stats?.progress">
              <p class="text-sm font-medium mb-1">
                {{ progressLabel }}
              </p>
              <UProgress
                v-if="stats.progress.percent !== null"
                :model-value="stats.progress.percent"
              />
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div>
                <p class="text-2xl font-semibold">
                  {{ (stats?.progress?.people ?? 0).toLocaleString() }}
                </p>
                <p class="text-xs text-(--ui-text-muted)">
                  people
                </p>
              </div>
              <div>
                <p class="text-2xl font-semibold">
                  {{ (stats?.totals?.prayers ?? 0).toLocaleString() }}
                </p>
                <p class="text-xs text-(--ui-text-muted)">
                  prayers
                </p>
              </div>
              <div>
                <p class="text-2xl font-semibold">
                  {{ stats?.prayingNow ?? 0 }}
                </p>
                <p class="text-xs text-(--ui-text-muted)">
                  praying now
                </p>
              </div>
            </div>
          </div>
          <div v-else>
            <UButton
              to="/site/campaigns/new"
              label="Create a campaign"
              icon="i-lucide-plus"
            />
          </div>
          <template #footer>
            <div class="flex gap-2">
              <UButton
                to="/site/campaigns"
                size="sm"
                variant="ghost"
                label="All campaigns"
              />
              <UButton
                v-if="can('pt.stats.read')"
                to="/site/stats"
                size="sm"
                variant="ghost"
                label="Stats"
              />
            </div>
          </template>
        </UCard>

        <div class="space-y-4">
          <UCard>
            <h2 class="font-semibold mb-2">
              Next steps
            </h2>
            <ul class="space-y-2 text-sm">
              <li>
                <NuxtLink
                  to="/site/content"
                  class="hover:underline"
                >Review prayer content</NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/site/landing"
                  class="hover:underline"
                >Edit the landing page</NuxtLink>
              </li>
              <li v-if="can('pt.email.send')">
                <NuxtLink
                  to="/marketing/test-emails"
                  class="hover:underline"
                >Send yourself a test email</NuxtLink>
              </li>
              <li v-if="can('pt.site.manage')">
                <NuxtLink
                  to="/site/settings/domains"
                  class="hover:underline"
                >Add your own domain</NuxtLink>
              </li>
            </ul>
          </UCard>
          <UCard>
            <div class="flex gap-3">
              <UIcon
                name="i-lucide-heart"
                class="size-6 text-(--ui-primary) shrink-0"
              />
              <div class="text-sm space-y-2">
                <p>Prayer.Tools is free for every campaign, kept running by people who give.</p>
                <UButton
                  :href="meta?.donateUrl"
                  target="_blank"
                  size="sm"
                  variant="soft"
                  label="Give to Prayer.Tools"
                />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </div>
</template>
