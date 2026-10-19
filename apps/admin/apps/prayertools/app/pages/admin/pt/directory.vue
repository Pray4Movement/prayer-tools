<script setup lang="ts">
// Operators approve directory listings and can unlist sites.
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] })

interface Entry { org_id: string, slug: string, name: string, description: string | null, status: string, requested_at: string | null, people_count: number }
const { data, refresh } = useFetch<{ entries: Entry[] }>('/api/pt/admin/directory', { key: 'pt-admin-directory' })
const { data: meta } = usePtMeta()
const toast = usePtToast()
async function set(e: Entry, status: 'listed' | 'unlisted') {
  try {
    await $fetch(`/api/pt/admin/directory/${e.org_id}`, { method: 'POST', body: { status } })
    await refresh()
  } catch (err) {
    toast.fail(err)
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">
      Directory
    </h1>
    <p
      v-if="!data?.entries.length"
      class="text-sm text-(--ui-text-muted)"
    >
      No listing requests.
    </p>
    <UCard
      v-for="e in data?.entries ?? []"
      :key="e.org_id"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="font-medium">
            {{ e.name }} <span class="text-xs text-(--ui-text-muted)">{{ e.slug }}.{{ meta?.siteBaseHost }}</span>
          </p>
          <p class="text-sm text-(--ui-text-muted)">
            {{ e.description }}
          </p>
          <p class="text-xs text-(--ui-text-muted)">
            Requested {{ ptFormatDate(e.requested_at) }} · {{ e.people_count }} people
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            :label="PT_LABELS.directoryStatus[e.status]"
            :color="ptStatusColor(e.status)"
            variant="subtle"
          />
          <UButton
            v-if="e.status !== 'listed'"
            size="sm"
            label="Approve"
            @click="set(e, 'listed')"
          />
          <UButton
            v-if="e.status !== 'unlisted'"
            size="sm"
            color="neutral"
            variant="soft"
            label="Unlist"
            @click="set(e, 'unlisted')"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
