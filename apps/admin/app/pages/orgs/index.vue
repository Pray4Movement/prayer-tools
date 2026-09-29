<script setup lang="ts">
// Your sites: every site you belong to. With none, onboarding starts here.
definePageMeta({ middleware: 'auth' })

interface SiteRow {
  id: string
  slug: string
  name: string
  roles: string[]
  status: 'draft' | 'published' | 'archived'
  suspended: boolean
  url: string
  recently_added: boolean
  onboarding: { step?: string, completed?: boolean }
  campaign: { id: string, name: string, state: string, start_date: string | null } | null
  people: number
}

const { data, status } = await useFetch<{ sites: SiteRow[] }>('/api/pt/sites', { key: 'pt-my-sites' })
const { user } = useAuth()
const isOperator = computed(() => !!(user.value as { is_admin?: boolean } | null)?.is_admin)
const q = ref('')
const sites = computed(() => (data.value?.sites ?? []).filter(s => !q.value || `${s.name} ${s.slug}`.toLowerCase().includes(q.value.toLowerCase())))
const newlyAdded = computed(() => (data.value?.sites ?? []).filter(s => s.recently_added))

function roleLabel(roles: string[]): string {
  return roles.map(r => PT_LABELS.role[r] ?? r).join(', ')
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Your sites
        </h1>
        <p class="text-sm text-(--ui-text-muted)">
          Every prayer campaign site you work on, in one place.
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          to="/libraries"
          icon="i-lucide-library"
          color="neutral"
          variant="outline"
          label="Libraries"
        />
        <UButton
          to="/personal"
          icon="i-lucide-images"
          color="neutral"
          variant="outline"
          label="My images & blocks"
        />
        <UButton
          to="/orgs/new"
          icon="i-lucide-plus"
          label="New site"
        />
      </div>
    </div>

    <UAlert
      v-for="s in newlyAdded"
      :key="`new-${s.id}`"
      icon="i-lucide-user-plus"
      color="info"
      variant="soft"
      :title="`You've been added to ${s.name}`"
      :description="`Your role: ${roleLabel(s.roles)}.`"
      :actions="[{ label: 'Open', to: `/@${s.slug}/site` }]"
    />

    <div
      v-if="status === 'pending'"
      class="text-sm text-(--ui-text-muted)"
    >
      Loading…
    </div>

    <UCard
      v-else-if="!data?.sites.length"
      :ui="{ body: 'p-8 text-center space-y-4' }"
    >
      <UIcon
        name="i-lucide-sprout"
        class="size-12 text-(--ui-primary) mx-auto"
      />
      <h2 class="text-xl font-semibold">
        Start your first prayer campaign
      </h2>
      <p class="text-(--ui-text-muted) max-w-lg mx-auto">
        A site is the home of your prayer effort: its address, team, look and the people who pray.
        Each time you run it — Ramadan 2026, Ramadan 2027 — is a campaign on that site.
      </p>
      <UButton
        to="/orgs/new"
        size="lg"
        label="Create a site"
        icon="i-lucide-arrow-right"
        trailing
      />
    </UCard>

    <template v-else>
      <UInput
        v-if="(data?.sites.length ?? 0) > 6"
        v-model="q"
        icon="i-lucide-search"
        placeholder="Search your sites"
        class="w-full sm:w-80"
      />
      <div class="grid sm:grid-cols-2 gap-4">
        <UCard
          v-for="s in sites"
          :key="s.id"
          :ui="{ body: 'space-y-3' }"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <NuxtLink
                :to="`/@${s.slug}/site`"
                class="text-lg font-semibold hover:underline"
              >
                {{ s.name }}
              </NuxtLink>
              <p class="text-xs text-(--ui-text-muted) truncate">
                <a
                  :href="s.url"
                  target="_blank"
                  rel="noopener"
                  class="hover:underline"
                >{{ s.url.replace(/^https?:\/\//, '') }}</a>
              </p>
            </div>
            <UBadge
              :label="s.suspended ? 'Suspended' : PT_LABELS.siteStatus[s.status]"
              :color="s.suspended ? 'error' : ptStatusColor(s.status)"
              variant="subtle"
            />
          </div>
          <div class="text-sm space-y-1">
            <p v-if="s.campaign">
              <span class="font-medium">{{ s.campaign.name }}</span>
              <span class="text-(--ui-text-muted)"> · {{ PT_LABELS.campaignState[s.campaign.state] }}</span>
            </p>
            <p
              v-else
              class="text-(--ui-text-muted)"
            >
              No campaign yet
            </p>
            <p class="text-(--ui-text-muted)">
              {{ s.people.toLocaleString() }} people · {{ roleLabel(s.roles) }}
            </p>
          </div>
          <div class="flex gap-2">
            <UButton
              v-if="!s.onboarding?.completed && s.status === 'draft'"
              :to="`/@${s.slug}/site/setup`"
              size="sm"
              label="Continue setup"
              icon="i-lucide-list-checks"
            />
            <UButton
              :to="`/@${s.slug}/site`"
              size="sm"
              color="neutral"
              variant="outline"
              label="Open"
            />
          </div>
        </UCard>
      </div>
    </template>

    <p
      v-if="isOperator"
      class="text-sm text-(--ui-text-muted)"
    >
      Operators can search every site in <NuxtLink
        to="/admin/pt/sites"
        class="underline"
      >Admin → Sites</NuxtLink>.
    </p>
  </div>
</template>
