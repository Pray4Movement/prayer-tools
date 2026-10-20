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
interface Story { id: string, name: string | null, body: string, use_name: boolean, published: boolean }

const { data: site, refresh, can } = usePtSite()
const { data: meta } = usePtMeta()
const toast = usePtToast()

const lang = ref('en')
watch(site, (s) => {
  if (s && !s.site.languages.includes(lang.value)) lang.value = s.site.default_language
}, { immediate: true })
const isSource = computed(() => lang.value === site.value?.site.default_language)
const canWrite = computed(() => can('pt.site.write'))
const canEditLang = computed(() => isSource.value ? canWrite.value : can('pt.content.translate'))
const dir = computed(() => meta.value?.languages.find(l => l.code === lang.value)?.dir ?? 'ltr')

const why = ref<Record<string, Record<string, any> | null>>({})
const hidden = ref<string[]>([])
const stories = ref(true)
const custom = ref<CustomSection[]>([])
const description = ref<TranslatableText | null>(null)
const openIds = ref<string[]>([])
watch(site, (s) => {
  if (!s) return
  why.value = { ...(s.site.landing?.why ?? {}) }
  hidden.value = [...(s.site.landing?.hidden ?? meta.value?.templates.find(t => t.key === s.site.template_key)?.hiddenSections ?? [])]
  stories.value = s.site.landing?.stories !== false
  custom.value = JSON.parse(JSON.stringify(s.site.landing?.custom ?? []))
  description.value = s.site.description
  openIds.value = custom.value.filter(c => !c.heading.values[s.site.default_language]).map(c => c.id)
}, { immediate: true })

const whyDoc = computed({
  get: () => why.value[lang.value] ?? null,
  set: (v) => { why.value = { ...why.value, [lang.value]: v } }
})
const whyGuidance = computed(() => ptLandingGuidance('why', site.value?.site.template_key))

const sections = computed(() => (meta.value?.landing.sections ?? []).map(key => ({
  key,
  ...ptLandingSectionInfo(key),
  required: !(meta.value?.landing.hideable ?? []).includes(key)
})))
// The stories section shows only when it is not hidden and the stories flag is on.
function isShown(key: string) {
  return !hidden.value.includes(key) && (key !== 'stories' || stories.value)
}
function setShown(key: string, show: boolean) {
  hidden.value = show ? hidden.value.filter(x => x !== key) : [...new Set([...hidden.value, key])]
  if (key === 'stories') stories.value = show
}

const { data: storyData, execute: loadStories } = useFetch<{ stories: Story[] }>('/api/pt/stories', { key: 'pt-stories', immediate: false })
watch(() => can('pt.intercessors.read'), (ok) => {
  if (ok) loadStories()
}, { immediate: true })
const landingStories = computed(() => (storyData.value?.stories ?? []).filter(s => s.published))

function addSection() {
  const l = site.value!.site.default_language
  const id = crypto.randomUUID()
  custom.value.push({ id, heading: { source: l, values: { [l]: '' }, stale: [] }, body: {} })
  openIds.value = [...openIds.value, id]
}
function toggleOpen(id: string) {
  openIds.value = openIds.value.includes(id) ? openIds.value.filter(x => x !== id) : [...openIds.value, id]
}
function moveSection(i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= custom.value.length) return
  const arr = [...custom.value]
  ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  custom.value = arr
}
const removeId = ref<string | null>(null)
const removeOpen = computed({
  get: () => !!removeId.value,
  set: (v: boolean) => { if (!v) removeId.value = null }
})
function removeSection() {
  custom.value = custom.value.filter(s => s.id !== removeId.value)
  removeId.value = null
}
function clearImage(s: CustomSection) {
  s.image_url = undefined
  s.image_alt = undefined
}

const imagePickerFor = ref<string | null>(null)

const saving = ref(false)
async function save() {
  saving.value = true
  try {
    if (!canWrite.value) {
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
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">
          Landing page
        </h1>
        <p class="mt-1 text-sm text-(--ui-text-muted)">
          The first page people see. Write the parts that are yours; the rest comes from your site's setup.
        </p>
      </div>
      <div class="flex gap-2 items-center">
        <USelect
          v-if="site.site.languages.length > 1"
          v-model="lang"
          :items="site.site.languages.map(l => ({ label: languageName(meta, l), value: l }))"
          icon="i-lucide-languages"
          class="w-44"
        />
        <UButton
          :href="site.url"
          target="_blank"
          variant="soft"
          icon="i-lucide-external-link"
          label="View page"
        />
      </div>
    </div>

    <!-- Top -->
    <UCard>
      <template #header>
        <div class="flex items-start gap-3">
          <UIcon
            :name="PT_LANDING_SECTION_INFO.top!.icon"
            class="size-5 shrink-0 mt-0.5 text-(--ui-primary)"
          />
          <div class="min-w-0 flex-1">
            <p class="font-medium">
              {{ PT_LANDING_SECTION_INFO.top!.title }}
            </p>
            <p class="text-sm text-(--ui-text-muted)">
              {{ PT_LANDING_SECTION_INFO.top!.description }} The top image and colors are set under
              <ULink
                :to="`/@${site.org.slug}/site/settings?tab=look`"
                class="text-(--ui-primary)"
              >Settings → Look</ULink>.
            </p>
          </div>
        </div>
      </template>
      <PtTranslatableInput
        v-model="description"
        :languages="site.site.languages"
        :default-language="site.site.default_language"
        label="Short description"
        help="Used in link previews and the Prayer.Tools directory."
        multiline
        :source-locked="!canWrite"
      />
    </UCard>

    <!-- Why -->
    <UCard>
      <template #header>
        <div class="flex items-start gap-3">
          <UIcon
            :name="PT_LANDING_SECTION_INFO.why!.icon"
            class="size-5 shrink-0 mt-0.5 text-(--ui-primary)"
          />
          <div class="min-w-0 flex-1">
            <p class="font-medium">
              {{ PT_LANDING_SECTION_INFO.why!.title }}
            </p>
            <p class="text-sm text-(--ui-text-muted)">
              {{ PT_LANDING_SECTION_INFO.why!.description }}
            </p>
          </div>
          <UButton
            v-if="!isSource && canEditLang"
            size="sm"
            variant="soft"
            icon="i-lucide-languages"
            label="AI translate"
            @click="translateWhy"
          />
          <USwitch
            :model-value="isShown('why')"
            :disabled="!canWrite"
            label="Show"
            @update:model-value="v => setShown('why', v)"
          />
        </div>
      </template>
      <div class="space-y-3">
        <UAlert
          v-if="whyGuidance && canEditLang"
          color="neutral"
          variant="subtle"
          icon="i-lucide-lightbulb"
          :description="whyGuidance"
        />
        <PtRichEditor
          v-model="whyDoc"
          :dir="dir"
          :disabled="!canEditLang"
          placeholder="Why should people pray? Who are you praying for?"
        />
      </div>
    </UCard>

    <!-- Custom sections and stories -->
    <UCard>
      <template #header>
        <div class="flex items-start gap-3">
          <UIcon
            :name="PT_LANDING_SECTION_INFO.custom!.icon"
            class="size-5 shrink-0 mt-0.5 text-(--ui-primary)"
          />
          <div class="min-w-0 flex-1">
            <p class="font-medium">
              Your sections and stories
            </p>
            <p class="text-sm text-(--ui-text-muted)">
              Extra sections you add (heading, text, image, button) and, if you turn it on, stories from people who prayed.
            </p>
          </div>
          <USwitch
            :model-value="isShown('custom')"
            :disabled="!canWrite"
            label="Show"
            @update:model-value="v => setShown('custom', v)"
          />
        </div>
      </template>
      <div class="space-y-4">
        <div class="space-y-2">
          <div
            v-for="(s, i) in custom"
            :key="s.id"
            class="rounded-md border border-(--ui-border)"
          >
            <div class="flex items-center gap-2 px-3 py-2">
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                :icon="openIds.includes(s.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                :aria-label="openIds.includes(s.id) ? 'Collapse' : 'Expand'"
                @click="toggleOpen(s.id)"
              />
              <span class="flex-1 truncate text-sm font-medium">{{ s.heading.values[site.site.default_language] || 'New section' }}</span>
              <template v-if="canWrite">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-arrow-up"
                  aria-label="Move up"
                  :disabled="i === 0"
                  @click="moveSection(i, -1)"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-arrow-down"
                  aria-label="Move down"
                  :disabled="i === custom.length - 1"
                  @click="moveSection(i, 1)"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-lucide-trash-2"
                  aria-label="Remove section"
                  @click="removeId = s.id"
                />
              </template>
            </div>
            <div
              v-if="openIds.includes(s.id)"
              class="space-y-4 border-t border-(--ui-border) p-3"
            >
              <PtTranslatableInput
                v-model="s.heading"
                :languages="site.site.languages"
                :default-language="site.site.default_language"
                label="Heading"
                :source-locked="!canWrite"
              />
              <UFormField :label="site.site.languages.length > 1 ? `Text (${languageName(meta, lang)})` : 'Text'">
                <PtRichEditor
                  :model-value="s.body[lang] ?? null"
                  :dir="dir"
                  :disabled="!canEditLang"
                  min-height="8rem"
                  @update:model-value="(v) => { s.body = { ...s.body, [lang]: v as Record<string, any> } }"
                />
              </UFormField>
              <UFormField
                label="Image"
                description="Optional."
              >
                <div class="flex flex-wrap items-center gap-3">
                  <img
                    v-if="s.image_url"
                    :src="s.image_url"
                    alt=""
                    class="h-20 rounded-md object-cover"
                  >
                  <template v-if="canWrite">
                    <UButton
                      size="sm"
                      variant="soft"
                      icon="i-lucide-image"
                      :label="s.image_url ? 'Change image' : 'Add image'"
                      @click="imagePickerFor = s.id"
                    />
                    <UButton
                      v-if="s.image_url"
                      size="sm"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-x"
                      label="Remove"
                      @click="clearImage(s)"
                    />
                  </template>
                </div>
              </UFormField>
              <div class="grid gap-4 sm:grid-cols-2">
                <PtTranslatableInput
                  v-model="s.button_label"
                  :languages="site.site.languages"
                  :default-language="site.site.default_language"
                  label="Button text"
                  help="Optional. Shown when a link is set."
                  :source-locked="!canWrite"
                />
                <UFormField
                  label="Button link"
                  description="Web address the button opens."
                >
                  <UInput
                    v-model="s.button_url"
                    type="url"
                    placeholder="https://"
                    class="w-full"
                    :disabled="!canWrite"
                  />
                </UFormField>
              </div>
            </div>
          </div>
          <UButton
            v-if="canWrite"
            variant="soft"
            icon="i-lucide-plus"
            label="Add a section"
            @click="addSection"
          />
        </div>
        <USeparator />
        <div class="space-y-2">
          <USwitch
            :model-value="isShown('stories')"
            :disabled="!canWrite"
            label="Show a stories section"
            description="Only stories you publish from the Stories page, and names only when the writer allowed it."
            @update:model-value="v => setShown('stories', v)"
          />
          <div
            v-if="isShown('stories') && can('pt.intercessors.read')"
            class="space-y-2"
          >
            <p
              v-if="!landingStories.length"
              class="text-sm text-(--ui-text-muted)"
            >
              No stories on the landing page yet. The section stays hidden until you add one.
            </p>
            <div
              v-for="st in landingStories"
              :key="st.id"
              class="rounded-md bg-(--ui-bg-elevated) p-3 text-sm"
            >
              <p class="line-clamp-3 whitespace-pre-line">
                {{ st.body }}
              </p>
              <p class="mt-1 text-xs text-(--ui-text-muted)">
                {{ st.use_name && st.name ? st.name : 'Anonymous' }}
              </p>
            </div>
            <UButton
              :to="`/@${site.org.slug}/site/landing/stories`"
              variant="link"
              icon="i-lucide-heart-handshake"
              label="Stories"
              class="px-0"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Fixed sections -->
    <UCard>
      <template #header>
        <p class="font-medium">
          Sections
        </p>
        <p class="text-sm text-(--ui-text-muted)">
          The page shows these sections in this order. Sections with nothing to show hide on their own. "How it works",
          "Share" and "Contact" use standard wording you can change under Settings → Wording.
        </p>
      </template>
      <div class="divide-y divide-(--ui-border)">
        <div
          v-for="s in sections"
          :key="s.key"
          class="flex items-start gap-3 py-3"
        >
          <UIcon
            :name="s.icon"
            class="size-5 shrink-0 mt-0.5"
            :class="s.required || isShown(s.key) ? 'text-(--ui-primary)' : 'text-(--ui-text-dimmed)'"
          />
          <div class="min-w-0 flex-1">
            <p
              class="text-sm font-medium"
              :class="{ 'text-(--ui-text-muted)': !s.required && !isShown(s.key) }"
            >
              {{ s.title }}
            </p>
            <p class="text-xs text-(--ui-text-muted)">
              {{ s.description }}
            </p>
            <ULink
              v-if="s.key === 'signup'"
              :to="`/@${site.org.slug}/site/landing/signup-form`"
              class="mt-1 inline-flex items-center gap-1 text-xs text-(--ui-primary)"
            >
              Edit the signup form
              <UIcon
                name="i-lucide-arrow-right"
                class="size-3"
              />
            </ULink>
          </div>
          <UBadge
            v-if="s.required"
            variant="subtle"
            color="neutral"
            label="Always shown"
          />
          <USwitch
            v-else
            :model-value="isShown(s.key)"
            :disabled="!canWrite"
            :aria-label="`Show ${s.title}`"
            @update:model-value="v => setShown(s.key, v)"
          />
        </div>
      </div>
    </UCard>

    <div class="flex justify-end sticky bottom-4">
      <UButton
        :label="canWrite ? 'Save landing page' : 'Save translation'"
        size="lg"
        icon="i-lucide-save"
        :loading="saving"
        @click="save"
      />
    </div>

    <UModal
      v-model:open="removeOpen"
      title="Remove this section?"
      description="Its text in every language is removed when you save the landing page."
    >
      <template #footer>
        <div class="flex gap-2">
          <UButton
            color="error"
            label="Remove"
            @click="removeSection"
          />
          <UButton
            variant="ghost"
            color="neutral"
            label="Cancel"
            @click="removeId = null"
          />
        </div>
      </template>
    </UModal>

    <PtImagePicker
      :open="!!imagePickerFor"
      :language="site.site.default_language"
      @update:open="(v) => { if (!v) imagePickerFor = null }"
      @select="(a) => { const s = custom.find(x => x.id === imagePickerFor); if (s) { s.image_url = a.url; s.image_alt = { source: site!.site.default_language, values: { [site!.site.default_language]: a.alt } } } imagePickerFor = null }"
    />
  </div>
</template>
