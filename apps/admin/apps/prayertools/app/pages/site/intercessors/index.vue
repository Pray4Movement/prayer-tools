<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface Row {
  id: string
  name: string
  email: string | null
  status: string
  delivery: string
  language: string
  verified_at: string | null
  created_at: string
  last_activity_at: string | null
  commitments: number
}

const { can, data: site } = usePtSite()
const { data: meta } = usePtMeta()
const q = ref('')
const status = ref<string | undefined>(undefined)
const campaign = ref<string | undefined>(undefined)
const page = ref(1)
const { data: campaigns } = useFetch<{ campaigns: { id: string, name: string }[] }>('/api/pt/campaigns', { key: 'pt-campaigns' })
const query = computed(() => ({ q: q.value || undefined, status: status.value, campaign: campaign.value, page: page.value }))
const { data, pending } = useFetch<{ intercessors: Row[], total: number, perPage: number, anonymousApp: { total: number, active: number } }>('/api/pt/intercessors', { query, key: 'pt-intercessors', watch: [query] })

watch([q, status, campaign], () => { page.value = 1 })

const exportUrl = computed(() => `/api/pt/export.csv`)
async function download() {
  const res = await $fetch.raw<Blob>(exportUrl.value, { responseType: 'blob' })
  const url = URL.createObjectURL(res._data!)
  const a = document.createElement('a')
  a.href = url
  a.download = `${site.value?.org.slug}-intercessors.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Intercessors
        </h1>
        <p class="text-sm text-(--ui-text-muted)">
          {{ data?.total ?? 0 }} people signed up on the web<span v-if="data?.anonymousApp.total">, plus {{ data.anonymousApp.active }} active app users (shown as counts only)</span>.
        </p>
      </div>
      <UButton
        v-if="can('pt.intercessors.export')"
        icon="i-lucide-download"
        variant="outline"
        label="Export CSV"
        @click="download"
      />
    </div>
    <div class="flex flex-wrap gap-2">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        placeholder="Name or email"
        class="w-64"
      />
      <USelect
        v-model="status"
        :items="Object.entries(PT_LABELS.subscriptionStatus).map(([value, label]) => ({ value, label }))"
        placeholder="Any status"
        class="w-44"
      />
      <USelect
        v-model="campaign"
        :items="(campaigns?.campaigns ?? []).map(c => ({ value: c.id, label: c.name }))"
        placeholder="Any campaign"
        class="w-56"
      />
      <UButton
        v-if="status || campaign"
        icon="i-lucide-x"
        variant="ghost"
        color="neutral"
        label="Clear"
        @click="status = undefined; campaign = undefined"
      />
    </div>
    <UTable
      :data="data?.intercessors ?? []"
      :loading="pending"
      :columns="[
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'email', header: 'Email' },
        { accessorKey: 'status', header: 'Status' },
        { accessorKey: 'language', header: 'Language' },
        { accessorKey: 'commitments', header: 'Prayer times' },
        { accessorKey: 'created_at', header: 'Signed up' }
      ]"
      :on-select="(_e: unknown, row: { original: Row }) => navigateTo(`/site/intercessors/${row.original.id}`)"
      class="rounded-lg border border-(--ui-border)"
      empty="No intercessors yet."
    >
      <template #name-cell="{ row }">
        <NuxtLink
          :to="`/site/intercessors/${row.original.id}`"
          class="font-medium hover:underline"
        >{{ row.original.name }}</NuxtLink>
        <UBadge
          v-if="!row.original.verified_at"
          size="sm"
          variant="soft"
          color="warning"
          label="Unconfirmed"
          class="ms-2"
        />
      </template>
      <template #status-cell="{ row }">
        <UBadge
          :label="PT_LABELS.subscriptionStatus[row.original.status]"
          :color="ptStatusColor(row.original.status)"
          variant="subtle"
        />
      </template>
      <template #language-cell="{ row }">
        {{ languageName(meta, row.original.language) }}
      </template>
      <template #created_at-cell="{ row }">
        {{ ptFormatDate(row.original.created_at) }}
      </template>
    </UTable>
    <UPagination
      v-if="(data?.total ?? 0) > (data?.perPage ?? 50)"
      v-model:page="page"
      :total="data?.total ?? 0"
      :items-per-page="data?.perPage ?? 50"
    />
  </div>
</template>
