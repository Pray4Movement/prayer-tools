<script setup lang="ts">
// Library catalog: the template's suggested libraries first, "See more" for
// the rest; filters by cadence, language and text; preview entries before
// choosing. Emits the chosen library id.
interface Library {
  id: string
  title: string
  description: string | null
  cadence: 'daily' | 'weekly'
  entry_count: number
  languages: string[]
  topics: string[]
  license: string
  credit: string | null
  suggested: boolean
  mine: boolean
  platform: boolean
}

const props = withDefaults(defineProps<{ template?: string | null, cadence?: string, siteLanguages?: string[], usedIds?: string[] }>(), { template: null, cadence: undefined, siteLanguages: () => [], usedIds: () => [] })
const emit = defineEmits<{ use: [string] }>()
const { data: meta } = usePtMeta()

const q = ref('')
const cadence = ref<string | undefined>(props.cadence)
const seeMore = ref(false)
const { data, status } = useFetch<{ libraries: Library[] }>('/api/pt/libraries', {
  query: computed(() => ({ template: props.template ?? undefined, cadence: cadence.value, q: q.value || undefined })),
  key: computed(() => `pt-catalog-${props.template}-${cadence.value}-${q.value}`)
})

const suggested = computed(() => (data.value?.libraries ?? []).filter(l => l.suggested))
const others = computed(() => (data.value?.libraries ?? []).filter(l => !l.suggested))
const shown = computed(() => (seeMore.value || !suggested.value.length ? [...suggested.value, ...others.value] : suggested.value))

const preview = reactive({ open: false, lib: null as Library | null, day: 1, lang: 'en', doc: null as Record<string, any> | null, loading: false })

async function loadPreview() {
  if (!preview.lib) return
  preview.loading = true
  try {
    const res = await $fetch<{ published: Record<string, any> | null }>(`/api/pt/libraries/${preview.lib.id}/entries/${preview.day}/${preview.lang}`)
    preview.doc = res.published
  } finally {
    preview.loading = false
  }
}

function openPreview(lib: Library) {
  preview.lib = lib
  preview.day = 1
  preview.lang = lib.languages.find(l => props.siteLanguages.includes(l)) ?? lib.languages[0] ?? 'en'
  preview.open = true
  loadPreview()
}

function coverage(lib: Library): string {
  if (!props.siteLanguages.length) return lib.languages.map(l => languageName(meta.value, l)).join(', ')
  const have = props.siteLanguages.filter(l => lib.languages.includes(l))
  return `${have.length}/${props.siteLanguages.length} of your languages`
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        placeholder="Search libraries"
        class="w-full sm:w-72"
      />
      <USelect
        v-model="cadence"
        :items="[{ label: 'Daily', value: 'daily' }, { label: 'Weekly', value: 'weekly' }]"
        placeholder="Any cadence"
        class="w-40"
      />
      <UButton
        v-if="cadence"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        aria-label="Clear cadence"
        @click="cadence = undefined"
      />
    </div>
    <div
      v-if="status === 'pending' && !data"
      class="text-sm text-(--ui-text-muted)"
    >
      Loading…
    </div>
    <div
      v-else-if="!shown.length"
      class="text-sm text-(--ui-text-muted)"
    >
      No libraries match. You can write your own content instead.
    </div>
    <div class="grid md:grid-cols-2 gap-3">
      <UCard
        v-for="lib in shown"
        :key="lib.id"
        :ui="{ body: 'space-y-2' }"
      >
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold">
            {{ lib.title }}
          </h3>
          <div class="flex gap-1">
            <UBadge
              v-if="lib.suggested"
              label="Suggested"
              color="primary"
              variant="soft"
              size="sm"
            />
            <UBadge
              v-if="lib.mine"
              label="Yours"
              color="neutral"
              variant="soft"
              size="sm"
            />
          </div>
        </div>
        <p
          v-if="lib.description"
          class="text-sm text-(--ui-text-muted) line-clamp-3"
        >
          {{ lib.description }}
        </p>
        <p class="text-xs text-(--ui-text-muted)">
          {{ lib.entry_count }} {{ lib.cadence === 'weekly' ? 'weeks' : 'days' }} · {{ coverage(lib) }} · {{ PT_LABELS.license[lib.license] ?? lib.license }}
          <span v-if="lib.credit"> · {{ lib.credit }}</span>
        </p>
        <div class="flex gap-2">
          <UButton
            size="sm"
            :label="usedIds.includes(lib.id) ? 'In use' : 'Use this'"
            :disabled="usedIds.includes(lib.id)"
            @click="emit('use', lib.id)"
          />
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            label="Preview"
            @click="openPreview(lib)"
          />
        </div>
      </UCard>
    </div>
    <UButton
      v-if="suggested.length && others.length && !seeMore"
      label="See more libraries"
      variant="link"
      @click="seeMore = true"
    />

    <UModal
      v-model:open="preview.open"
      :title="preview.lib?.title"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <div class="space-y-3">
          <div class="flex gap-2 items-center">
            <UInputNumber
              v-model="preview.day"
              :min="1"
              :max="preview.lib?.entry_count || 1"
              class="w-28"
              @update:model-value="loadPreview"
            />
            <USelect
              v-model="preview.lang"
              :items="(preview.lib?.languages ?? []).map(l => ({ label: languageName(meta, l), value: l }))"
              class="w-44"
              @update:model-value="loadPreview"
            />
          </div>
          <div
            v-if="preview.loading"
            class="text-sm text-(--ui-text-muted)"
          >
            Loading…
          </div>
          <PtContentView
            v-else-if="preview.doc"
            :doc="preview.doc"
          />
          <p
            v-else
            class="text-sm text-(--ui-text-muted)"
          >
            No entry for this day in this language.
          </p>
        </div>
      </template>
    </UModal>
  </div>
</template>
