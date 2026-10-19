<script setup lang="ts">
// Operators curate platform libraries, review share requests and import
// content packs (JSON) as platform libraries.
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] })

const { data, refresh } = useFetch<{ requests: Record<string, any>[], platform: Record<string, any>[] }>('/api/pt/admin/libraries', { key: 'pt-admin-libraries' })
const toast = usePtToast()
async function review(id: string, approve: boolean) {
  try {
    await $fetch(`/api/pt/admin/libraries/${id}/review`, { method: 'POST', body: { approve } })
    await refresh()
  } catch (err) {
    toast.fail(err)
  }
}
const newOpen = ref(false)
const form = reactive({ title: '', cadence: 'daily', source_language: 'en', license: 'own', credit: 'Prayer.Tools' })
async function createPlatform() {
  try {
    const res = await $fetch<{ id: string }>('/api/pt/libraries', { method: 'POST', body: { ...form, platform: true } })
    await navigateTo(`/libraries/${res.id}`)
  } catch (err) {
    toast.fail(err)
  }
}
const importFile = ref<File | null>(null)
async function importPack() {
  if (!importFile.value) return
  try {
    const pack = JSON.parse(await importFile.value.text())
    const res = await $fetch<{ id: string, imported: number }>('/api/pt/admin/libraries/import', { method: 'POST', body: pack })
    toast.ok(`Imported ${res.imported} entries`)
    importFile.value = null
    await refresh()
  } catch (err) {
    toast.fail(err, 'Import failed')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        Libraries
      </h1>
      <UButton
        icon="i-lucide-plus"
        label="New platform library"
        @click="newOpen = true"
      />
    </div>
    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Share requests
        </h2>
      </template>
      <p
        v-if="!data?.requests.length"
        class="text-sm text-(--ui-text-muted)"
      >
        None waiting.
      </p>
      <div
        v-for="r in data?.requests ?? []"
        :key="r.id"
        class="py-3 border-b border-(--ui-border) last:border-0 flex flex-wrap items-start justify-between gap-3"
      >
        <div class="text-sm">
          <NuxtLink
            :to="`/libraries/${r.id}`"
            class="font-medium hover:underline"
          >
            {{ r.title }}
          </NuxtLink>
          <p class="text-(--ui-text-muted)">
            {{ r.owner_name }} ({{ r.owner_email }}) · {{ r.entry_count }} entries · {{ r.languages.join(', ') }}
          </p>
          <p>License: <strong>{{ PT_LABELS.license[r.license] }}</strong><span v-if="r.license_note"> — {{ r.license_note }}</span> · rights confirmed: {{ r.rights_confirmed ? 'yes' : 'no' }}</p>
        </div>
        <div class="flex gap-2">
          <UButton
            size="sm"
            label="Approve"
            @click="review(r.id, true)"
          />
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            label="Decline"
            @click="review(r.id, false)"
          />
        </div>
      </div>
    </UCard>
    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Platform libraries
        </h2>
      </template>
      <ul class="text-sm divide-y divide-(--ui-border)">
        <li
          v-for="l in data?.platform ?? []"
          :key="l.id"
          class="py-2 flex justify-between"
        >
          <NuxtLink
            :to="`/libraries/${l.id}`"
            class="hover:underline"
          >{{ l.title }}</NuxtLink>
          <span class="text-(--ui-text-muted)">{{ l.entry_count }} entries · v{{ l.published_version }}</span>
        </li>
      </ul>
    </UCard>
    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Import a content pack
        </h2>
        <p class="text-sm text-(--ui-text-muted)">
          JSON with title, cadence, source_language, license, credit and entries [{ day, language, html | text | doc }]. HTML from
          WordPress prayer fuel exports becomes headings and paragraphs.
        </p>
      </template>
      <div class="flex items-end gap-2">
        <UFileUpload
          v-model="importFile"
          accept="application/json"
          variant="button"
          label="Choose file"
        />
        <UButton
          label="Import"
          :disabled="!importFile"
          @click="importPack"
        />
      </div>
    </UCard>
    <UModal
      v-model:open="newOpen"
      title="New platform library"
    >
      <template #body>
        <div class="space-y-3">
          <UFormField label="Title">
            <UInput
              v-model="form.title"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Cadence">
            <USelect
              v-model="form.cadence"
              :items="[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }]"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end w-full">
          <UButton
            label="Create"
            :disabled="form.title.trim().length < 2"
            @click="createPlatform"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
