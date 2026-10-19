<script setup lang="ts">
// Background jobs: failed jobs with a retry button.
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] })
const status = ref('failed')
const { data, refresh } = useFetch<{ jobs: Record<string, any>[], counts: Record<string, number> }>('/api/pt/admin/jobs', { query: computed(() => ({ status: status.value })), key: 'pt-admin-jobs' })
async function retry(id: string) {
  await $fetch(`/api/pt/admin/jobs/${id}/retry`, { method: 'POST' })
  await refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        Jobs
      </h1>
      <UTabs
        v-model="status"
        :items="['failed', 'pending', 'processing', 'completed'].map(s => ({ label: `${s} (${data?.counts[s] ?? 0})`, value: s }))"
        :content="false"
        size="sm"
      />
    </div>
    <UTable
      :data="data?.jobs ?? []"
      :columns="[
        { accessorKey: 'type', header: 'Type' },
        { accessorKey: 'site_slug', header: 'Site' },
        { accessorKey: 'attempts', header: 'Attempts' },
        { accessorKey: 'error_message', header: 'Error' },
        { accessorKey: 'created_at', header: 'Created' },
        { id: 'actions', header: '' }
      ]"
      empty="No jobs."
      class="rounded-lg border border-(--ui-border)"
    >
      <template #created_at-cell="{ row }">
        {{ ptFormatDate(row.original.created_at, { dateStyle: 'short', timeStyle: 'short' }) }}
      </template>
      <template #error_message-cell="{ row }">
        <span class="text-xs whitespace-pre-wrap">{{ row.original.error_message }}</span>
      </template>
      <template #actions-cell="{ row }">
        <UButton
          v-if="row.original.status === 'failed'"
          size="xs"
          label="Retry"
          @click="retry(row.original.id)"
        />
      </template>
    </UTable>
  </div>
</template>
