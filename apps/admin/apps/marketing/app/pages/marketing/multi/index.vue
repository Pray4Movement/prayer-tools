<script setup lang="ts">
import { MARKETING_STATUS, marketingDate, marketingErrorMessage } from '../../../utils/marketing-ui'

definePageMeta({ middleware: 'auth', tenantExempt: true })

interface Parent {
  id: string
  status: string
  subject: string | null
  org_ids: string[]
  scheduled_at: string | null
  finished_at: string | null
  created_at: string
  people: number
  sent: number
}

const parents = ref<Parent[]>([])
const siteNames = ref<Record<string, string>>({})
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const res = await $fetch<{ parents: Parent[], siteNames: Record<string, string> }>('/api/marketing/multi')
    parents.value = res.parents
    siteNames.value = res.siteNames
  } catch (err) {
    error.value = marketingErrorMessage(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Send to several sites
        </h1>
        <p class="text-sm text-(--ui-text-muted)">
          Write once and send from several of your sites. Each person gets one email, from the site they joined most recently where they opted in.
        </p>
      </div>
      <UButton
        label="New send"
        icon="i-lucide-plus"
        to="/marketing/multi/new"
      />
    </div>
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :description="error"
    />
    <USkeleton
      v-if="loading"
      class="h-24 w-full"
    />
    <UEmpty
      v-else-if="!parents.length"
      icon="i-lucide-send"
      title="Nothing sent to several sites yet"
    />
    <ul
      v-else
      class="divide-y divide-(--ui-border) rounded-lg border border-(--ui-border)"
    >
      <li
        v-for="p in parents"
        :key="p.id"
      >
        <NuxtLink
          :to="`/marketing/multi/${p.id}`"
          class="flex flex-wrap items-center gap-3 p-4 hover:bg-(--ui-bg-elevated)"
        >
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">
              {{ p.subject || 'Untitled email' }}
            </p>
            <p class="text-xs text-(--ui-text-muted) truncate">
              {{ p.org_ids.map(id => siteNames[id] ?? 'Removed site').join(', ') }} · {{ p.status === 'sent' ? `sent ${marketingDate(p.finished_at)}` : `created ${marketingDate(p.created_at)}` }}
            </p>
          </div>
          <span
            v-if="p.status !== 'draft'"
            class="text-sm tabular-nums text-(--ui-text-muted)"
          >{{ p.sent.toLocaleString() }} sent</span>
          <UBadge
            :label="MARKETING_STATUS[p.status]?.label ?? p.status"
            :color="MARKETING_STATUS[p.status]?.color ?? 'neutral'"
            variant="subtle"
          />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
