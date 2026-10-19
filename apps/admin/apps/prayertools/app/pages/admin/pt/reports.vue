<script setup lang="ts">
// Reports about sites from the app and directory. Operators can unlist.
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] })
const { data, refresh } = useFetch<{ reports: Record<string, any>[] }>('/api/pt/admin/reports', { key: 'pt-admin-reports' })
async function handle(id: string, unlist: boolean) {
  await $fetch(`/api/pt/admin/reports/${id}`, { method: 'POST', body: { unlist } })
  await refresh()
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">
      Reports
    </h1>
    <p
      v-if="!data?.reports.length"
      class="text-sm text-(--ui-text-muted)"
    >
      No reports.
    </p>
    <UCard
      v-for="r in data?.reports ?? []"
      :key="r.id"
    >
      <div class="flex flex-wrap items-start justify-between gap-3 text-sm">
        <div>
          <p class="font-medium">
            {{ r.site_name }} <span class="text-(--ui-text-muted)">({{ r.site_slug }})</span>
          </p>
          <p>{{ r.reason }}<span v-if="r.details"> — {{ r.details }}</span></p>
          <p class="text-xs text-(--ui-text-muted)">
            {{ ptFormatDate(r.created_at) }} via {{ r.source ?? 'unknown' }}<span v-if="r.handled_at"> · handled {{ ptFormatDate(r.handled_at) }}</span>
          </p>
        </div>
        <div
          v-if="!r.handled_at"
          class="flex gap-2"
        >
          <UButton
            size="sm"
            color="warning"
            label="Unlist and close"
            @click="handle(r.id, true)"
          />
          <UButton
            size="sm"
            variant="soft"
            label="Close"
            @click="handle(r.id, false)"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
