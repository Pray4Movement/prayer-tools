<script setup lang="ts">
// Prayer content for a campaign: the stacked libraries, and the entry editor
// (day × language). A followed library renders from the library; the first
// edit gives the site its own copy.
definePageMeta({ middleware: 'auth' })

interface Lib {
  siteLibraryId: string
  title: string
  cadence: string
  libraryId: string | null
  follows: boolean
  frozenVersion: number | null
  latestVersion: number | null
  updateAvailable: boolean
  credit: string | null
  license: string | null
  entryCount: number
  coverage: Record<string, number>
  missingLanguages: string[]
  staleCount: number
}

const { data: site, can } = usePtSite()
const { data: meta } = usePtMeta()
const toast = usePtToast()
const route = useRoute()

const { data: campaigns } = useFetch<{ campaigns: { id: string, name: string, status: string, cadence: string }[] }>('/api/pt/campaigns', { key: 'pt-campaigns' })
const campaignId = ref<string | undefined>(typeof route.query.campaign === 'string' ? route.query.campaign : undefined)
watch([campaigns, site], () => {
  if (!campaignId.value) campaignId.value = site.value?.currentCampaign?.id ?? campaigns.value?.campaigns[0]?.id
}, { immediate: true })
const campaign = computed(() => campaigns.value?.campaigns.find(c => c.id === campaignId.value))

const { data: content, refresh } = useFetch<{ libraries: Lib[], languages: string[], defaultLanguage: string }>('/api/pt/content', {
  query: computed(() => ({ campaign: campaignId.value })),
  key: computed(() => `pt-content-${campaignId.value}`),
  watch: [campaignId]
})

const selected = ref<string | null>(null)
watch(content, (c) => {
  if (!c?.libraries.find(l => l.siteLibraryId === selected.value)) selected.value = c?.libraries[0]?.siteLibraryId ?? null
}, { immediate: true })
const lib = computed(() => content.value?.libraries.find(l => l.siteLibraryId === selected.value))

const day = ref(1)
const lang = ref('en')
watch(site, s => { if (s) lang.value = s.site.default_language }, { immediate: true })
const isSource = computed(() => lang.value === site.value?.site.default_language)
const canEdit = computed(() => isSource.value ? can('pt.content.write') : can('pt.content.translate'))
const dir = computed(() => meta.value?.languages.find(l => l.code === lang.value)?.dir ?? 'ltr')

const entry = ref<{ source: string, doc: Record<string, any> | null, stale: boolean, edited: boolean, languages: string[] } | null>(null)
const draft = ref<Record<string, any> | null>(null)
const editing = ref(false)
const loadingEntry = ref(false)

async function loadEntry() {
  if (!lib.value) return
  loadingEntry.value = true
  editing.value = false
  try {
    entry.value = await $fetch('/api/pt/content/entry', { query: { siteLibrary: lib.value.siteLibraryId, day: day.value, lang: lang.value } })
    draft.value = entry.value?.doc ? JSON.parse(JSON.stringify(entry.value.doc)) : null
  } finally {
    loadingEntry.value = false
  }
}
watch([selected, day, lang], loadEntry)
watch(lib, (l, old) => { if (l && !old) loadEntry() })

const saving = ref(false)
async function save() {
  if (!lib.value) return
  saving.value = true
  try {
    await $fetch('/api/pt/content/entry', { method: 'PUT', body: { siteLibraryId: lib.value.siteLibraryId, day: day.value, lang: lang.value, doc: draft.value ?? { type: 'doc', content: [] } } })
    toast.ok('Saved')
    await refresh()
    await loadEntry()
  } catch (err) {
    toast.fail(err)
  } finally {
    saving.value = false
  }
}

const translating = ref(false)
async function aiTranslate() {
  if (!lib.value || !site.value) return
  translating.value = true
  try {
    const src = await $fetch<{ doc: Record<string, any> | null }>('/api/pt/content/entry', { query: { siteLibrary: lib.value.siteLibraryId, day: day.value, lang: site.value.site.default_language } })
    if (!src.doc) throw new Error('Write this day in the default language first.')
    const res = await $fetch<{ doc: Record<string, any> }>('/api/pt/translate', { method: 'POST', body: { doc: src.doc, from: site.value.site.default_language, to: lang.value } })
    draft.value = res.doc
    editing.value = true
    toast.ok('Translated', 'Review it, then save.')
  } catch (err) {
    toast.fail(err, 'Translation failed')
  } finally {
    translating.value = false
  }
}

async function markCurrent() {
  if (!lib.value) return
  await $fetch('/api/pt/content/entry-status', { method: 'POST', body: { siteLibraryId: lib.value.siteLibraryId, day: day.value, lang: lang.value } })
  await loadEntry()
  await refresh()
}

// Library stack management
const catalogOpen = ref(false)
async function addLibrary(libraryId: string) {
  try {
    await $fetch('/api/pt/content/libraries', { method: 'POST', body: { campaignId: campaignId.value, libraryId } })
    catalogOpen.value = false
    await refresh()
  } catch (err) {
    toast.fail(err)
  }
}
const ownTitle = ref('')
async function addOwn() {
  try {
    const res = await $fetch<{ siteLibraryId: string }>('/api/pt/content/libraries', { method: 'POST', body: { campaignId: campaignId.value, title: ownTitle.value || 'Our prayer guide', cadence: campaign.value?.cadence } })
    ownTitle.value = ''
    await refresh()
    selected.value = res.siteLibraryId
  } catch (err) {
    toast.fail(err)
  }
}
async function removeLibrary(l: Lib) {
  await $fetch(`/api/pt/content/libraries/${l.siteLibraryId}`, { method: 'DELETE', query: { campaign: campaignId.value } })
  await refresh()
}
async function move(l: Lib, delta: number) {
  const ids = (content.value?.libraries ?? []).map(x => x.siteLibraryId)
  const i = ids.indexOf(l.siteLibraryId)
  const j = i + delta
  if (j < 0 || j >= ids.length) return
  ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
  await $fetch('/api/pt/content/order', { method: 'PUT', body: { campaignId: campaignId.value, ids } })
  await refresh()
}

const compare = reactive({ open: false, site: null as Record<string, any> | null, library: null as Record<string, any> | null })
async function openCompare() {
  if (!lib.value) return
  const res = await $fetch<{ site: Record<string, any> | null, library: Record<string, any> | null }>('/api/pt/content/compare', { query: { siteLibrary: lib.value.siteLibraryId, day: day.value, lang: lang.value } })
  compare.site = res.site
  compare.library = res.library
  compare.open = true
}
async function takeUpdate() {
  if (!lib.value) return
  await $fetch('/api/pt/content/take-update', { method: 'POST', body: { siteLibraryId: lib.value.siteLibraryId } })
  compare.open = false
  toast.ok('Updated to the latest version', 'Your edits to this library were replaced.')
  await refresh()
  await loadEntry()
}

const maxDay = computed(() => Math.max(lib.value?.entryCount ?? 1, 1) + (lib.value && !lib.value.follows ? 1 : 0))
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <PtCampaignTabs
      v-if="typeof route.query.campaign === 'string'"
      :campaign-id="route.query.campaign"
    />
    <PtContentTabs v-else />
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">
        Prayer content
      </h1>
      <USelect
        v-if="campaigns?.campaigns.length"
        v-model="campaignId"
        :items="campaigns.campaigns.map(c => ({ label: c.name, value: c.id }))"
        class="w-64"
      />
    </div>

    <UCard v-if="!campaigns?.campaigns.length">
      <p>Create a campaign first, then choose its content.</p>
    </UCard>

    <div
      v-else
      class="grid lg:grid-cols-[18rem_1fr] gap-6"
    >
      <div class="space-y-3">
        <div
          v-for="(l, i) in content?.libraries ?? []"
          :key="l.siteLibraryId"
          class="rounded-lg border p-3 cursor-pointer"
          :class="selected === l.siteLibraryId ? 'border-(--ui-primary) bg-(--ui-bg-elevated)' : 'border-(--ui-border)'"
          role="button"
          tabindex="0"
          @click="selected = l.siteLibraryId"
          @keydown.enter="selected = l.siteLibraryId"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="font-medium text-sm">
              {{ l.title }}
            </p>
            <div
              v-if="can('pt.content.write')"
              class="flex"
            >
              <UButton
                icon="i-lucide-chevron-up"
                size="xs"
                variant="ghost"
                color="neutral"
                aria-label="Move up"
                :disabled="i === 0"
                @click.stop="move(l, -1)"
              />
              <UButton
                icon="i-lucide-chevron-down"
                size="xs"
                variant="ghost"
                color="neutral"
                aria-label="Move down"
                :disabled="i === (content?.libraries.length ?? 0) - 1"
                @click.stop="move(l, 1)"
              />
              <UButton
                icon="i-lucide-x"
                size="xs"
                variant="ghost"
                color="neutral"
                aria-label="Remove from campaign"
                @click.stop="removeLibrary(l)"
              />
            </div>
          </div>
          <p class="text-xs text-(--ui-text-muted)">
            {{ l.entryCount }} entries ·
            <template v-if="l.follows">
              following the library
            </template>
            <template v-else-if="l.libraryId">
              your copy (v{{ l.frozenVersion }})
            </template>
            <template v-else>
              written for this site
            </template>
          </p>
          <div class="flex flex-wrap gap-1 mt-1">
            <UBadge
              v-if="l.updateAvailable"
              size="sm"
              color="info"
              variant="soft"
              :label="`v${l.latestVersion} available`"
            />
            <UBadge
              v-if="l.missingLanguages.length"
              size="sm"
              color="warning"
              variant="soft"
              :label="`Missing ${l.missingLanguages.join(', ')}`"
            />
            <UBadge
              v-if="l.staleCount"
              size="sm"
              color="warning"
              variant="soft"
              :label="`${l.staleCount} out of date`"
            />
          </div>
        </div>
        <template v-if="can('pt.content.write')">
          <UButton
            block
            icon="i-lucide-library"
            label="Add from library"
            variant="soft"
            @click="catalogOpen = true"
          />
          <div class="flex gap-2">
            <UInput
              v-model="ownTitle"
              placeholder="Your own content"
              size="sm"
              class="flex-1"
            />
            <UButton
              size="sm"
              icon="i-lucide-plus"
              aria-label="Create your own content"
              @click="addOwn"
            />
          </div>
        </template>
      </div>

      <UCard v-if="lib">
        <template #header>
          <div class="flex flex-wrap items-center gap-3">
            <UFormField label="Day">
              <UInputNumber
                v-model="day"
                :min="1"
                :max="maxDay"
                class="w-28"
              />
            </UFormField>
            <UFormField label="Language">
              <USelect
                v-model="lang"
                :items="(site?.site.languages ?? []).map(l => ({ label: languageName(meta, l) + (l === site?.site.default_language ? ' (default)' : ''), value: l }))"
                class="w-52"
              />
            </UFormField>
            <div class="ms-auto flex gap-2">
              <UButton
                v-if="lib.updateAvailable"
                size="sm"
                variant="soft"
                color="info"
                label="Compare with library"
                @click="openCompare"
              />
              <UButton
                v-if="!isSource && canEdit"
                size="sm"
                variant="soft"
                icon="i-lucide-languages"
                label="AI translate this day"
                :loading="translating"
                @click="aiTranslate"
              />
            </div>
          </div>
        </template>
        <div
          v-if="loadingEntry"
          class="text-sm text-(--ui-text-muted)"
        >
          Loading…
        </div>
        <div
          v-else
          class="space-y-3"
        >
          <UAlert
            v-if="entry?.stale"
            color="warning"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="Out of date"
            description="The default language was edited after this translation."
            :actions="canEdit ? [{ label: 'Keep as is', onClick: markCurrent }] : []"
          />
          <template v-if="!editing">
            <PtContentView
              v-if="entry?.doc"
              :doc="entry.doc"
              :dir="dir"
            />
            <p
              v-else
              class="text-sm text-(--ui-text-muted)"
            >
              No entry for day {{ day }} in {{ languageName(meta, lang) }}.
            </p>
            <UAlert
              v-if="lib.follows && canEdit"
              color="neutral"
              variant="soft"
              icon="i-lucide-info"
              description="This day comes from the library. Editing it gives your site its own copy of the library; its future updates will then not reach your site unless you choose to take them."
            />
            <UButton
              v-if="canEdit"
              :label="entry?.doc ? 'Edit' : 'Write this day'"
              icon="i-lucide-pencil"
              @click="editing = true"
            />
          </template>
          <template v-else>
            <PtRichEditor
              v-model="draft"
              placeholders
              :dir="dir"
              min-height="20rem"
            />
            <p class="text-xs text-(--ui-text-muted)">
              Placeholders like {place} are filled in on the site, so a library reads naturally on every site.
            </p>
            <div class="flex justify-end gap-2">
              <UButton
                label="Cancel"
                color="neutral"
                variant="ghost"
                @click="loadEntry"
              />
              <UButton
                label="Save"
                :loading="saving"
                @click="save"
              />
            </div>
          </template>
        </div>
      </UCard>
      <UCard v-else>
        <p class="text-sm text-(--ui-text-muted)">
          Add a library or write your own content for this campaign.
        </p>
      </UCard>
    </div>

    <UModal
      v-model:open="catalogOpen"
      title="Add from library"
      :ui="{ content: 'max-w-4xl' }"
    >
      <template #body>
        <PtLibraryCatalog
          :template="site?.site.template_key"
          :cadence="campaign?.cadence"
          :site-languages="site?.site.languages ?? []"
          :used-ids="(content?.libraries ?? []).map(l => l.libraryId).filter(Boolean) as string[]"
          @use="addLibrary"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="compare.open"
      title="Your copy and the latest library version"
      :ui="{ content: 'max-w-5xl' }"
    >
      <template #body>
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <h3 class="text-sm font-medium mb-2">
              Your copy
            </h3>
            <PtContentView :doc="compare.site" />
          </div>
          <div>
            <h3 class="text-sm font-medium mb-2">
              Latest library version
            </h3>
            <PtContentView :doc="compare.library" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between w-full">
          <p class="text-xs text-(--ui-text-muted)">
            Taking the update replaces every edit you made to this library.
          </p>
          <UButton
            v-if="can('pt.content.write')"
            label="Take the update"
            color="warning"
            @click="takeUpdate"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
