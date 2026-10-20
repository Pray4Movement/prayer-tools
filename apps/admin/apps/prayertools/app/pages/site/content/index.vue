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
    catalogOpen.value = false
    await refresh()
    selected.value = res.siteLibraryId
  } catch (err) {
    toast.fail(err)
  }
}
const removing = ref<Lib | null>(null)
const removeOpen = computed({
  get: () => !!removing.value,
  set: (v: boolean) => {
    if (!v) removing.value = null
  }
})
async function removeLibrary(l: Lib) {
  removing.value = null
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

function modeLabel(l: Lib): string {
  if (l.follows) return 'Following the library'
  if (l.libraryId) return `Your copy (v${l.frozenVersion})`
  return 'Your own content'
}
function coverageBadge(l: Lib, code: string): { label: string, color: 'success' | 'warning' | 'error' | 'neutral' } {
  const n = l.coverage[code] ?? 0
  if (!l.entryCount) return { label: '—', color: 'neutral' }
  if (n === 0) return { label: 'missing', color: 'error' }
  if (n < l.entryCount) return { label: `${n}/${l.entryCount}`, color: 'warning' }
  return { label: 'complete', color: 'success' }
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
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">
          Prayer content
        </h1>
        <p class="mt-1 max-w-2xl text-sm text-(--ui-text-muted)">
          Each {{ campaign?.cadence === 'weekly' ? 'week' : 'day' }} shows one entry from every library below, in this order.
          Libraries you follow get fixes and new translations automatically; the first edit gives your site its own copy.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <USelect
          v-if="campaigns?.campaigns.length"
          v-model="campaignId"
          :items="campaigns.campaigns.map(c => ({ label: c.name, value: c.id }))"
          class="w-64"
          aria-label="Campaign"
        />
        <UButton
          v-if="campaigns?.campaigns.length && can('pt.content.write')"
          icon="i-lucide-plus"
          label="Add content"
          @click="catalogOpen = true"
        />
      </div>
    </header>

    <UEmpty
      v-if="campaigns && !campaigns.campaigns.length"
      icon="i-lucide-calendar-plus"
      title="No campaign yet"
      description="Create a campaign first, then choose its content."
      :actions="[{ label: 'New campaign', icon: 'i-lucide-plus', to: '/site/campaigns/new' }]"
    />

    <UEmpty
      v-else-if="content && !content.libraries.length"
      icon="i-lucide-book-open"
      title="No prayer content yet"
      description="Choose a library from the catalog or write your own."
      :actions="can('pt.content.write') ? [{ label: 'Add content', icon: 'i-lucide-plus', onClick: () => { catalogOpen = true } }] : []"
    />

    <div
      v-else-if="content"
      class="grid lg:grid-cols-[20rem_1fr] gap-6 items-start"
    >
      <div class="space-y-3">
        <UCard
          v-for="(l, i) in content.libraries"
          :key="l.siteLibraryId"
          class="cursor-pointer transition-colors"
          :class="selected === l.siteLibraryId ? 'ring-2 ring-(--ui-primary)' : 'hover:bg-(--ui-bg-elevated)/50'"
          :ui="{ body: 'p-3 sm:p-4 space-y-2' }"
          role="button"
          tabindex="0"
          :aria-pressed="selected === l.siteLibraryId"
          @click="selected = l.siteLibraryId"
          @keydown.enter="selected = l.siteLibraryId"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="font-medium text-sm min-w-0">
              {{ l.title }}
            </p>
            <div
              v-if="can('pt.content.write')"
              class="flex shrink-0 -me-1 -mt-1"
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
                :disabled="i === content.libraries.length - 1"
                @click.stop="move(l, 1)"
              />
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                variant="ghost"
                color="error"
                aria-label="Remove from campaign"
                @click.stop="removing = l"
              />
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1">
            <UBadge
              size="sm"
              variant="subtle"
              :color="l.follows ? 'info' : l.libraryId ? 'warning' : 'neutral'"
              :label="modeLabel(l)"
            />
            <UBadge
              v-if="l.updateAvailable"
              size="sm"
              color="info"
              variant="subtle"
              icon="i-lucide-sparkle"
              :label="`v${l.latestVersion} available`"
            />
          </div>
          <p class="text-xs text-(--ui-text-muted)">
            {{ l.entryCount }} entries<template v-if="l.credit">
              · {{ l.credit }}
            </template>
          </p>
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="code in content.languages"
              :key="code"
              size="sm"
              variant="subtle"
              :color="coverageBadge(l, code).color"
              :label="`${languageName(meta, code)}: ${coverageBadge(l, code).label}`"
            />
            <UBadge
              v-if="l.staleCount"
              size="sm"
              color="warning"
              variant="subtle"
              icon="i-lucide-clock-alert"
              :label="`${l.staleCount} out of date`"
            />
          </div>
        </UCard>
      </div>

      <UCard v-if="lib">
        <template #header>
          <div class="flex flex-wrap items-end gap-3">
            <UFormField :label="lib.cadence === 'weekly' ? 'Week' : 'Day'">
              <div class="flex items-center gap-2">
                <UInputNumber
                  v-model="day"
                  :min="1"
                  :max="maxDay"
                  class="w-28"
                />
                <span class="text-sm text-(--ui-text-muted)">of {{ lib.entryCount }}</span>
              </div>
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
                v-if="!isSource && canEdit"
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
          class="space-y-4"
        >
          <UAlert
            v-if="lib.updateAvailable"
            color="info"
            variant="subtle"
            icon="i-lucide-sparkle"
            :title="`A newer version of this library is available (version ${lib.latestVersion}).`"
            :actions="[{ label: 'Compare', variant: 'soft', onClick: openCompare }]"
          />
          <UAlert
            v-if="entry?.stale"
            color="warning"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            title="Out of date"
            description="The default language was edited after this translation."
            :actions="canEdit ? [{ label: 'Keep as is', variant: 'soft', onClick: markCurrent }] : []"
          />
          <template v-if="!editing">
            <UAlert
              v-if="lib.follows && canEdit"
              color="info"
              variant="subtle"
              icon="i-lucide-git-branch"
              title="Editing this day gives your site its own copy of this library."
              description="From then on, updates to the library don't reach your site unless you choose to take them."
            />
            <PtContentView
              v-if="entry?.doc"
              :doc="entry.doc"
              :dir="dir"
            />
            <UEmpty
              v-else
              icon="i-lucide-file-x"
              :title="`No entry for ${lib.cadence === 'weekly' ? 'week' : 'day'} ${day} in ${languageName(meta, lang)}.`"
              size="sm"
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
                icon="i-lucide-check"
                :loading="saving"
                @click="save"
              />
            </div>
          </template>
        </div>
      </UCard>
    </div>

    <USlideover
      v-model:open="catalogOpen"
      title="Add prayer content"
      :ui="{ content: 'sm:max-w-3xl' }"
    >
      <template #body>
        <div class="space-y-5">
          <PtLibraryCatalog
            :template="site?.site.template_key"
            :cadence="campaign?.cadence"
            :site-languages="site?.site.languages ?? []"
            :used-ids="(content?.libraries ?? []).map(l => l.libraryId).filter(Boolean) as string[]"
            @use="addLibrary"
          />
          <UCard>
            <div class="flex flex-wrap items-end justify-between gap-3">
              <div class="min-w-0 flex-1 space-y-2">
                <div>
                  <p class="font-medium">
                    Write your own
                  </p>
                  <p class="text-sm text-(--ui-text-muted)">
                    Start from scratch with an empty set of entries for this campaign.
                  </p>
                </div>
                <UInput
                  v-model="ownTitle"
                  placeholder="Our prayer guide"
                  aria-label="Name of your content"
                  class="w-full max-w-sm"
                />
              </div>
              <UButton
                variant="soft"
                icon="i-lucide-pencil-line"
                label="Start from scratch"
                @click="addOwn"
              />
            </div>
          </UCard>
        </div>
      </template>
    </USlideover>

    <UModal
      v-model:open="removeOpen"
      :title="`Remove ${removing?.title}?`"
      :description="removing?.follows ? 'The library stays in the catalog; you can add it again later.' : 'It is removed from this campaign.'"
    >
      <template #footer>
        <div class="flex gap-2">
          <UButton
            color="error"
            icon="i-lucide-trash-2"
            label="Remove"
            @click="removing && removeLibrary(removing)"
          />
          <UButton
            variant="ghost"
            color="neutral"
            label="Cancel"
            @click="removing = null"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="compare.open"
      title="Your copy and the latest library version"
      :ui="{ content: 'max-w-5xl' }"
    >
      <template #body>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="rounded-lg border border-(--ui-border) p-4">
            <h3 class="text-sm font-semibold text-(--ui-text-muted) mb-2">
              Your copy
            </h3>
            <PtContentView :doc="compare.site" />
          </div>
          <div class="rounded-lg border border-(--ui-primary)/40 p-4">
            <h3 class="text-sm font-semibold text-(--ui-primary) mb-2">
              Latest library version
            </h3>
            <PtContentView :doc="compare.library" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex items-center justify-between gap-3 w-full">
          <p class="text-xs text-(--ui-text-muted) flex items-center gap-1.5">
            <UIcon
              name="i-lucide-triangle-alert"
              class="size-4 shrink-0 text-(--ui-warning)"
            />
            Taking the update replaces every edit you made to this library.
          </p>
          <UButton
            v-if="can('pt.content.write')"
            label="Take the update"
            icon="i-lucide-download"
            color="warning"
            @click="takeUpdate"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
