<script setup lang="ts">
// Operators: search every site, open one for support, assign a new owner.
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] })

interface Site { id: string, slug: string, name: string, status: string, created_at: string, suspended_at: string | null, owners: string[], active_subscriptions: number, languages: string[] }
const q = ref('')
const { data } = useFetch<{ sites: Site[] }>('/api/pt/admin/sites', { query: computed(() => ({ q: q.value || undefined })), key: 'pt-admin-sites' })
const toast = usePtToast()

async function support(s: Site) {
  try {
    const res = await $fetch<{ slug: string }>(`/api/pt/admin/sites/${s.id}/support`, { method: 'POST' })
    await navigateTo(`/@${res.slug}/site`)
  } catch (err) {
    toast.fail(err)
  }
}
const ownerFor = ref<Site | null>(null)
const { data: members, refresh: loadMembers } = useFetch<{ members: { id: string, email: string, display_name: string, roles: string[] }[] }>(() => `/api/pt/admin/sites/${ownerFor.value?.id}/members`, { immediate: false, key: 'pt-admin-members' })
watch(ownerFor, s => { if (s) loadMembers() })
async function makeOwner(userId: string) {
  try {
    await $fetch(`/api/pt/admin/sites/${ownerFor.value!.id}/owner`, { method: 'POST', body: { userId } })
    toast.ok('Owner assigned')
    await loadMembers()
  } catch (err) {
    toast.fail(err)
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">
      Sites
    </h1>
    <UInput
      v-model="q"
      icon="i-lucide-search"
      placeholder="Search by name or address"
      class="w-80"
    />
    <UTable
      :data="data?.sites ?? []"
      :columns="[
        { accessorKey: 'name', header: 'Site' },
        { accessorKey: 'status', header: 'Status' },
        { accessorKey: 'owners', header: 'Owners' },
        { accessorKey: 'active_subscriptions', header: 'Active people' },
        { accessorKey: 'created_at', header: 'Created' },
        { id: 'actions', header: '' }
      ]"
      class="rounded-lg border border-(--ui-border)"
    >
      <template #name-cell="{ row }">
        <p class="font-medium">
          {{ row.original.name }}
        </p>
        <p class="text-xs text-(--ui-text-muted)">
          {{ row.original.slug }}
        </p>
      </template>
      <template #status-cell="{ row }">
        <UBadge
          :label="row.original.suspended_at ? 'Suspended' : PT_LABELS.siteStatus[row.original.status]"
          :color="row.original.suspended_at ? 'error' : ptStatusColor(row.original.status)"
          variant="subtle"
        />
      </template>
      <template #owners-cell="{ row }">
        <span class="text-xs">{{ row.original.owners.join(', ') || '— no owner —' }}</span>
      </template>
      <template #created_at-cell="{ row }">
        {{ ptFormatDate(row.original.created_at) }}
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton
            size="xs"
            variant="soft"
            label="Open for support"
            @click="support(row.original)"
          />
          <UButton
            size="xs"
            variant="ghost"
            label="Owners"
            @click="ownerFor = row.original"
          />
        </div>
      </template>
    </UTable>
    <UModal
      :open="!!ownerFor"
      :title="`Team of ${ownerFor?.name}`"
      @update:open="(v) => { if (!v) ownerFor = null }"
    >
      <template #body>
        <ul class="divide-y divide-(--ui-border)">
          <li
            v-for="m in members?.members ?? []"
            :key="m.id"
            class="py-2 flex items-center justify-between text-sm"
          >
            <span>{{ m.display_name }} ({{ m.email }}) — {{ m.roles.map(r => PT_LABELS.role[r] ?? r).join(', ') }}</span>
            <UButton
              v-if="!m.roles.includes('admin')"
              size="xs"
              label="Make owner"
              @click="makeOwner(m.id)"
            />
          </li>
        </ul>
      </template>
    </UModal>
  </div>
</template>
