<script setup lang="ts">
// Every intercessor export on the platform.
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] })
const { data } = useFetch<{ exports: Record<string, any>[] }>('/api/pt/admin/exports', { key: 'pt-admin-exports' })
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">
      Intercessor exports
    </h1>
    <UTable
      :data="data?.exports ?? []"
      :columns="[
        { accessorKey: 'created_at', header: 'When' },
        { accessorKey: 'site_name', header: 'Site' },
        { accessorKey: 'display_name', header: 'By' },
        { accessorKey: 'email', header: 'Email' },
        { accessorKey: 'row_count', header: 'Rows' }
      ]"
      empty="No exports yet."
      class="rounded-lg border border-(--ui-border)"
    >
      <template #created_at-cell="{ row }">
        {{ ptFormatDate(row.original.created_at, { dateStyle: 'medium', timeStyle: 'short' }) }}
      </template>
    </UTable>
  </div>
</template>
