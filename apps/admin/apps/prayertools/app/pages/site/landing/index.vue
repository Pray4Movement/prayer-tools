<script setup lang="ts">
// The landing page: fixed sections in a fixed order. The champion writes the
// "why" text and custom sections, hides sections they don't need, and chooses
// whether published stories show. Editable wording overrides live under
// Settings → Wording.
import type { TranslatableText } from '@prayertools/shared/db/schema'

definePageMeta({ middleware: 'auth' })

interface CustomSection {
  id: string
  heading: TranslatableText
  body: Record<string, Record<string, any>>
  image_url?: string
  image_alt?: TranslatableText
  button_label?: TranslatableText
  button_url?: string
}

const { data: site, refresh, can } = usePtSite()
const { data: meta } = usePtMeta()
const toast = usePtToast()

const lang = ref('en')
watch(site, s => { if (s && !s.site.languages.includes(lang.value)) lang.value = s.site.default_language }, { immediate: true })
const isSource = computed(() => lang.value === site.value?.site.default_language)
const canEditLang = computed(() => isSource.value ? can('pt.site.write') : can('pt.content.translate'))
const dir = computed(() => meta.value?.languages.find(l => l.code === lang.value)?.dir ?? 'ltr')

const why = ref<Record<string, Record<string, any> | null>>({})
const hidden = ref<string[]>([])
const stories = ref(true)
const custom = ref<CustomSection[]>([])
const description = ref<TranslatableText | null>(null)
watch(site, (s) => {
  if (!s) return
  why.value = { ...(s.site.landing?.why ?? {}) }
  hidden.value = [...(s.site.landing?.hidden ?? meta.value?.templates.find(t => t.key === s.site.template_key)?.hiddenSections ?? [])]
  stories.value = s.site.landing?.stories !== false
  custom.value = JSON.parse(JSON.stringify(s.site.landing?.custom ?? []))
  description.value = s.site.description
}, { immediate: true })

const whyDoc = computed({
  get: () => why.value[lang.value] ?? null,
  set: (v) => { why.value = { ...why.value, [lang.value]: v } }
})

function addSection() {
  const l = site.value!.site.default_language
  custom.value.push({ id: crypto.randomUUID(), heading: { source: l, values: { [l]: '' }, stale: [] }, body: {} })
}
function removeSection(id: string) {
  custom.value = custom.value.filter(s => s.id !== id)
}
function moveSection(i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= custom.value.length) return
  const arr = [...custom.value]
  ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  custom.value = arr
}

const imagePickerFor = ref<string | null>(null)

const saving = ref(false)
async function save() {
  saving.value = true
  try {
    if (!can('pt.site.write')) {
      await saveTranslation()
      await refresh()
      toast.ok('Translation saved')
      return
    }
    await $fetch('/api/pt/site', { method: 'PATCH', body: { description: description.value, landing: { why: why.value, hidden: hidden.value, stories: stories.value, custom: custom.value } } })
    await refresh()
    toast.ok('Landing page saved')
  } catch (err) {
    toast.fail(err)
  } finally {
    saving.value = false
  }
}

// Translators save only the current language, one field at a time.
async function saveTranslation() {
  const l = lang.value
  const put = (body: Record<string, unknown>) => $fetch('/api/pt/site/translation', { method: 'PUT', body: { lang: l, ...body } })
  if (description.value?.values[l] !== undefined) await put({ field: 'description', value: description.value.values[l] })
  if (why.value[l]) await put({ field: 'why', value: why.value[l] })
  for (const s of custom.value) {
    if (s.heading.values[l] !== undefined) await put({ field: 'custom', sectionId: s.id, part: 'heading', value: s.heading.values[l] })
    if (s.body[l]) await put({ field: 'custom', sectionId: s.id, part: 'body', value: s.body[l] })
    if (s.button_label?.values[l] !== undefined) await put({ field: 'custom', sectionId: s.id, part: 'button_label', value: s.button_label.values[l] })
  }
}

async function translateWhy() {
  const s = site.value!
  const src = why.value[s.site.default_language]
  if (!src) return
  try {
    const res = await $fetch<{ doc: Record<string, any> }>('/api/pt/translate', { method: 'POST', body: { doc: src, from: s.site.default_language, to: lang.value } })
    whyDoc.value = res.doc
  } catch (err) {
    toast.fail(err, 'Translation failed')
  }
}
</script>

<template>
  <div
    v-if="site"
    class="max-w-4xl mx-auto space-y-6"
  >
    <PtLandingTabs />
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Landing page
        </h1>
        <p class="text-sm text-(--ui-text-muted)">
          Sections appear in a fixed order; empty sections hide themselves.
        </p>
      </div>
      <div class="flex gap-2 items-center">
        <USelect
          v-model="lang"
          :items="site.site.languages.map(l => ({ label: languageName(meta, l), value: l }))"
          class="w-44"
        />
        <UButton
          :href="site.url"
          target="_blank"
          variant="outline"
          color="neutral"
          icon="i-lucide-external-link"
          label="View"
        />
      </div>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          1 · Top
        </h2>
      </template>
      <div class="space-y-3 text-sm">
        <p class="text-(--ui-text-muted)">
          Site name, top image, people count or goal progress, and the signup button. The image and colors are under
          Settings → Look.
        </p>
        <PtTranslatableInput
          v-model="description"
          :languages="site.site.languages"
          :default-language="site.site.default_language"
          label="Short description"
          multiline
          :source-locked="!can('pt.site.write')"
        />
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">
            2 · Why this campaign
          </h2>
          <UButton
            v-if="!isSource && canEditLang"
            size="sm"
            variant="soft"
            icon="i-lucide-languages"
            label="AI translate"
            @click="translateWhy"
          />
        </div>
      </template>
      <PtRichEditor
        v-model="whyDoc"
        :dir="dir"
        :disabled="!canEditLang"
        placeholder="Why should people pray? Who are you praying for?"
      />
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">
            3 · Your sections and stories
          </h2>
          <UButton
            v-if="can('pt.site.write')"
            size="sm"
            icon="i-lucide-plus"
            label="Add section"
            @click="addSection"
          />
        </div>
      </template>
      <div class="space-y-4">
        <USwitch
          v-model="stories"
          :disabled="!can('pt.site.write')"
          label="Show stories"
          description="Only stories you publish from the Stories page, and names only when the writer allowed it."
        />
        <div
          v-for="(s, i) in custom"
          :key="s.id"
          class="rounded-md border border-(--ui-border) p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Section {{ i + 1 }}</span>
            <div
              v-if="can('pt.site.write')"
              class="flex"
            >
              <UButton
                icon="i-lucide-chevron-up"
                size="xs"
                variant="ghost"
                color="neutral"
                aria-label="Move up"
                @click="moveSection(i, -1)"
              />
              <UButton
                icon="i-lucide-chevron-down"
                size="xs"
                variant="ghost"
                color="neutral"
                aria-label="Move down"
                @click="moveSection(i, 1)"
              />
              <UButton
                icon="i-lucide-trash"
                size="xs"
                variant="ghost"
                color="error"
                aria-label="Remove section"
                @click="removeSection(s.id)"
              />
            </div>
          </div>
          <PtTranslatableInput
            v-model="s.heading"
            :languages="site.site.languages"
            :default-language="site.site.default_language"
            label="Heading"
            :source-locked="!can('pt.site.write')"
          />
          <UFormField :label="`Text (${languageName(meta, lang)})`">
            <PtRichEditor
              :model-value="s.body[lang] ?? null"
              :dir="dir"
              :disabled="!canEditLang"
              min-height="8rem"
              @update:model-value="(v) => { s.body = { ...s.body, [lang]: v as Record<string, any> } }"
            />
          </UFormField>
          <div class="flex flex-wrap items-end gap-3">
            <div>
              <img
                v-if="s.image_url"
                :src="s.image_url"
                alt=""
                class="h-20 rounded"
              >
              <UButton
                v-if="can('pt.site.write')"
                size="sm"
                variant="soft"
                icon="i-lucide-image"
                :label="s.image_url ? 'Change image' : 'Add image'"
                @click="imagePickerFor = s.id"
              />
            </div>
            <PtTranslatableInput
              v-model="s.button_label"
              :languages="site.site.languages"
              :default-language="site.site.default_language"
              label="Button text (optional)"
              class="flex-1 min-w-48"
            />
            <UFormField
              label="Button link"
              class="flex-1 min-w-48"
            >
              <UInput
                v-model="s.button_url"
                type="url"
                placeholder="https://…"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Sections shown
        </h2>
      </template>
      <div class="grid sm:grid-cols-2 gap-2">
        <UCheckbox
          v-for="s in meta?.landing.hideable ?? []"
          :key="s"
          :model-value="!hidden.includes(s)"
          :label="PT_LABELS.landingSection[s]"
          :disabled="!can('pt.site.write')"
          @update:model-value="(v) => { hidden = v ? hidden.filter(x => x !== s) : [...hidden, s] }"
        />
      </div>
      <p class="text-xs text-(--ui-text-muted) mt-3">
        The top and signup sections always show. "How it works", "Share" and "Contact" use standard wording you can change under
        Settings → Wording.
      </p>
    </UCard>

    <div class="flex justify-end sticky bottom-4">
      <UButton
        label="Save landing page"
        size="lg"
        :loading="saving"
        @click="save"
      />
    </div>

    <PtImagePicker
      :open="!!imagePickerFor"
      :language="site.site.default_language"
      @update:open="(v) => { if (!v) imagePickerFor = null }"
      @select="(a) => { const s = custom.find(x => x.id === imagePickerFor); if (s) { s.image_url = a.url; s.image_alt = { source: site!.site.default_language, values: { [site!.site.default_language]: a.alt } } } imagePickerFor = null }"
    />
  </div>
</template>
