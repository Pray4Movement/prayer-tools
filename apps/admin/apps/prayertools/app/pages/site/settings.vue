<script setup lang="ts">
// Site settings: details, languages, look, sending identity, signup
// questions, consent options, wording, behaviour, directory, status.
// Only values that differ from the code defaults are stored.
import type { TranslatableText } from '@prayertools/shared/db/schema'

definePageMeta({ middleware: 'auth' })

const { data: site, refresh, can, isOwner } = usePtSite()
const { data: meta } = usePtMeta()
const toast = usePtToast()
const route = useRoute()
const router = useRouter()

const tabs = computed(() => [
  { label: 'Details', value: 'details', icon: 'i-lucide-info' },
  { label: 'Languages', value: 'languages', icon: 'i-lucide-languages' },
  { label: 'Look', value: 'look', icon: 'i-lucide-palette' },
  ...(can('pt.site.manage') ? [{ label: 'Sending', value: 'sending', icon: 'i-lucide-send' }] : []),
  { label: 'Signup', value: 'signup', icon: 'i-lucide-clipboard-list' },
  { label: 'Wording', value: 'wording', icon: 'i-lucide-type' },
  { label: 'Behaviour', value: 'behaviour', icon: 'i-lucide-sliders-horizontal' },
  ...(can('pt.site.manage') ? [{ label: 'Status', value: 'status', icon: 'i-lucide-power' }] : [])
])
const tab = computed({
  get: () => String(route.query.tab ?? 'details'),
  set: v => router.replace({ query: { ...route.query, tab: v } })
})

async function patchSite(body: Record<string, unknown>, message = 'Saved') {
  try {
    await $fetch('/api/pt/site', { method: 'PATCH', body })
    await refresh()
    toast.ok(message)
  } catch (err) {
    toast.fail(err)
  }
}

// Details
const details = reactive({ name: '', purpose: 'place', place_name: '', people_group: '', latitude: null as number | null, longitude: null as number | null, timezone: 'UTC' })
// Languages
const languages = ref<string[]>([])
const defaultLanguage = ref('en')
// Look
const branding = ref<Record<string, any>>({})
const imagePicker = ref<'image' | 'logo' | 'share' | null>(null)
// Sending
const identity = ref<Record<string, any>>({})
const signature = ref<TranslatableText | null>(null)
// Behaviour
const settings = ref<Record<string, any>>({})

watch(site, (s) => {
  if (!s) return
  Object.assign(details, { name: s.org.name, purpose: s.site.purpose ?? 'place', place_name: s.site.place_name ?? '', people_group: s.site.people_group ?? '', latitude: s.site.latitude, longitude: s.site.longitude, timezone: s.site.timezone })
  languages.value = [...s.site.languages]
  defaultLanguage.value = s.site.default_language
  branding.value = { ...s.site.branding }
  identity.value = { ...s.site.email_identity }
  signature.value = s.site.email_identity?.signature ?? null
  settings.value = { ...s.site.settings }
}, { immediate: true })

const languageItems = computed(() => (meta.value?.languages ?? []).map(l => ({ label: `${l.name} — ${l.native}`, value: l.code })))
const contrastWarning = computed(() => site.value?.brand.tooPale)

// Signup questions + consent options
interface Field { id: string, key: string, kind: string, label: TranslatableText, options: { key: string, label: TranslatableText }[], required: boolean }
interface Option { id: string, key: string, label: TranslatableText, active: boolean }
const { data: signup, refresh: refreshSignup } = useFetch<{ fields: Field[], consentOptions: Option[] }>('/api/pt/signup-fields', { key: 'pt-signup-fields' })
const newField = reactive({ kind: 'text', label: null as TranslatableText | null, options: [] as { key: string, label: TranslatableText }[], required: false })
function addOption() {
  const l = site.value!.site.default_language
  newField.options.push({ key: `o${newField.options.length + 1}`, label: { source: l, values: { [l]: '' }, stale: [] } })
}
async function createField() {
  try {
    await $fetch('/api/pt/signup-fields', { method: 'POST', body: { ...newField } })
    Object.assign(newField, { kind: 'text', label: null, options: [], required: false })
    await refreshSignup()
    toast.ok('Question added')
  } catch (err) {
    toast.fail(err)
  }
}
async function saveField(f: Field) {
  try {
    await $fetch(`/api/pt/signup-fields/${f.id}`, { method: 'PATCH', body: { label: f.label, options: f.options, required: f.required } })
    toast.ok('Saved')
  } catch (err) {
    toast.fail(err)
  }
}
async function deleteField(f: Field) {
  await $fetch(`/api/pt/signup-fields/${f.id}`, { method: 'DELETE' })
  await refreshSignup()
}
const newOption = ref<TranslatableText | null>(null)
async function createOption() {
  try {
    await $fetch('/api/pt/consent-options', { method: 'POST', body: { label: newOption.value } })
    newOption.value = null
    await refreshSignup()
  } catch (err) {
    toast.fail(err)
  }
}
async function saveOption(o: Option, patch: Record<string, unknown>) {
  try {
    await $fetch(`/api/pt/consent-options/${o.id}`, { method: 'PATCH', body: patch })
    await refreshSignup()
  } catch (err) {
    toast.fail(err)
  }
}

// Wording
const EDITABLE: { key: string, label: string, multiline?: boolean }[] = [
  { key: 'landing.why.title', label: '“Why” section heading' },
  { key: 'landing.how.title', label: '“How it works” heading' },
  { key: 'landing.how.body', label: '“How it works” text', multiline: true },
  { key: 'landing.signup.title', label: 'Signup heading' },
  { key: 'landing.signup.intro', label: 'Signup introduction', multiline: true },
  { key: 'landing.today.title', label: 'Today\'s prayer heading' },
  { key: 'landing.stories.title', label: 'Stories heading' },
  { key: 'landing.share.title', label: 'Share heading' },
  { key: 'landing.contact.title', label: 'Contact heading' },
  { key: 'share.default_message', label: 'Default share message', multiline: true },
  { key: 'signup.success', label: 'Message after signing up', multiline: true },
  { key: 'between.notify_intro', label: 'Between campaigns: “notify me” text', multiline: true }
]
const { data: strings, refresh: refreshStrings } = useFetch<{ strings: { key: string, language: string, value: string }[] }>('/api/pt/strings', { key: 'pt-strings' })
const wordingLang = ref('en')
watch(site, s => { if (s) wordingLang.value = s.site.default_language }, { immediate: true })
const wording = ref<Record<string, string>>({})
watch([strings, wordingLang], () => {
  wording.value = Object.fromEntries((strings.value?.strings ?? []).filter(s => s.language === wordingLang.value).map(s => [s.key, s.value]))
}, { immediate: true })
async function saveWording(key: string) {
  try {
    await $fetch('/api/pt/strings', { method: 'PUT', body: { key, language: wordingLang.value, value: wording.value[key] ?? '' } })
    await refreshStrings()
    toast.ok('Saved')
  } catch (err) {
    toast.fail(err)
  }
}

// Status
const previewUrl = ref<string | null>(null)
async function setStatus(action: string) {
  try {
    await $fetch('/api/pt/site/status', { method: 'POST', body: { action } })
    await refresh()
    toast.ok('Updated')
  } catch (err) {
    toast.fail(err)
  }
}
async function preview() {
  const res = await $fetch<{ url: string }>('/api/pt/site/preview-link', { method: 'POST' })
  previewUrl.value = res.url
}
async function directory(listed: boolean) {
  try {
    await $fetch('/api/pt/directory', { method: 'POST', body: { listed } })
    await refresh()
    toast.ok(listed ? 'Listing requested' : 'Removed from the directory')
  } catch (err) {
    toast.fail(err)
  }
}
const deleteConfirm = ref('')
const deleteOpen = ref(false)
async function deleteSite() {
  try {
    await $fetch('/api/pt/site', { method: 'DELETE', body: { confirm: deleteConfirm.value } })
    await navigateTo('/orgs')
  } catch (err) {
    toast.fail(err)
  }
}
const { data: exportsLog } = useFetch<{ exports: { id: string, row_count: number, created_at: string, display_name: string, email: string }[] }>('/api/pt/exports', { key: 'pt-exports', immediate: false })
watch(tab, t => { if (t === 'status' && can('pt.site.manage')) refreshNuxtData('pt-exports') }, { immediate: true })
</script>

<template>
  <div
    v-if="site"
    class="max-w-4xl mx-auto space-y-6"
  >
    <h1 class="text-2xl font-semibold">
      Settings
    </h1>
    <UTabs
      v-model="tab"
      :items="tabs"
      :content="false"
      class="w-full"
    />

    <UCard v-if="tab === 'details'">
      <fieldset
        :disabled="!can('pt.site.write')"
        class="space-y-4"
      >
        <UFormField label="Site name">
          <UInput
            v-model="details.name"
            class="w-full"
          />
        </UFormField>
        <UFormField label="What you are praying for">
          <URadioGroup
            v-model="details.purpose"
            :items="Object.entries(PT_LABELS.purpose).map(([value, label]) => ({ value, label }))"
            orientation="horizontal"
          />
        </UFormField>
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField
            label="Place"
            help="Used in content placeholders like {place}."
          >
            <UInput
              v-model="details.place_name"
              class="w-full"
            />
          </UFormField>
          <UFormField label="People group">
            <UInput
              v-model="details.people_group"
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField label="Coordinates of the place prayed for">
          <div class="flex gap-2">
            <UInputNumber
              v-model="details.latitude"
              :step="0.0001"
              :min="-90"
              :max="90"
              placeholder="Latitude"
              class="w-36"
            />
            <UInputNumber
              v-model="details.longitude"
              :step="0.0001"
              :min="-180"
              :max="180"
              placeholder="Longitude"
              class="w-36"
            />
          </div>
        </UFormField>
        <UFormField label="Timezone">
          <USelectMenu
            v-model="details.timezone"
            :items="ptTimezones()"
            class="w-full sm:w-80"
          />
        </UFormField>
        <div class="flex justify-end">
          <UButton
            label="Save"
            @click="patchSite({ ...details, place_name: details.place_name || null, people_group: details.people_group || null })"
          />
        </div>
      </fieldset>
    </UCard>

    <UCard v-else-if="tab === 'languages'">
      <fieldset
        :disabled="!can('pt.site.write')"
        class="space-y-4"
      >
        <UFormField
          label="Languages"
          help="The public site's language switcher, signup languages, and which languages content should exist in."
        >
          <USelectMenu
            v-model="languages"
            :items="languageItems"
            value-key="value"
            multiple
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Default language"
          help="Used when a visitor's language isn't one of the site's."
        >
          <USelect
            v-model="defaultLanguage"
            :items="languageItems.filter(l => languages.includes(l.value))"
            class="w-72"
          />
        </UFormField>
        <div class="flex justify-end">
          <UButton
            label="Save"
            :disabled="!languages.length || !languages.includes(defaultLanguage)"
            @click="patchSite({ languages, default_language: defaultLanguage })"
          />
        </div>
      </fieldset>
    </UCard>

    <UCard v-else-if="tab === 'look'">
      <fieldset
        :disabled="!can('pt.site.write')"
        class="space-y-6"
      >
        <UFormField label="Brand color">
          <div class="flex items-center gap-3">
            <UPopover>
              <UButton
                :style="{ background: branding.color ?? site.brand.color, color: site.brand.textColor }"
                :label="branding.color ?? site.brand.color"
              />
              <template #content>
                <UColorPicker
                  v-model="branding.color"
                  class="p-2"
                />
              </template>
            </UPopover>
            <span class="text-sm text-(--ui-text-muted)">Text on it is set to {{ site.brand.textColor === '#ffffff' ? 'white' : 'dark' }} for contrast.</span>
          </div>
          <UAlert
            v-if="contrastWarning"
            class="mt-2"
            color="warning"
            variant="soft"
            description="This color is too pale to be readable as links and buttons on white."
          />
        </UFormField>
        <div class="grid sm:grid-cols-3 gap-4">
          <div
            v-for="slot in (['image', 'logo', 'share'] as const)"
            :key="slot"
            class="space-y-2"
          >
            <p class="text-sm font-medium">
              {{ slot === 'image' ? 'Top image' : slot === 'logo' ? 'Logo (emails and header)' : 'Share image (link previews)' }}
            </p>
            <div
              v-if="branding[`${slot === 'share' ? 'share_image' : slot}_url`]"
              class="relative aspect-video rounded-md overflow-hidden border border-(--ui-border)"
            >
              <img
                :src="branding[`${slot === 'share' ? 'share_image' : slot}_url`]"
                alt=""
                class="size-full object-cover"
                :style="slot === 'image' ? { objectPosition: `${(branding.focal_x ?? 0.5) * 100}% ${(branding.focal_y ?? 0.5) * 100}%` } : {}"
              >
            </div>
            <div class="flex gap-2">
              <UButton
                size="sm"
                variant="soft"
                icon="i-lucide-image"
                label="Choose"
                @click="imagePicker = slot"
              />
              <UButton
                v-if="branding[`${slot === 'share' ? 'share_image' : slot}_url`]"
                size="sm"
                variant="ghost"
                color="neutral"
                label="Remove"
                @click="branding[`${slot === 'share' ? 'share_image' : slot}_url`] = undefined"
              />
            </div>
          </div>
        </div>
        <template v-if="branding.image_url">
          <UFormField
            label="Focal point of the top image"
            help="Keeps the important part visible when phones crop the image."
          >
            <div class="grid grid-cols-2 gap-4 max-w-md">
              <USlider
                v-model="branding.focal_x"
                :min="0"
                :max="1"
                :step="0.05"
                aria-label="Horizontal focal point"
              />
              <USlider
                v-model="branding.focal_y"
                :min="0"
                :max="1"
                :step="0.05"
                aria-label="Vertical focal point"
              />
            </div>
          </UFormField>
          <PtTranslatableInput
            v-model="branding.image_alt"
            :languages="site.site.languages"
            :default-language="site.site.default_language"
            label="Image description (alt text)"
            required
          />
          <UFormField label="Image credit (shown under the image)">
            <UInput
              v-model="branding.image_credit"
              class="w-full"
            />
          </UFormField>
        </template>
        <div class="flex justify-end">
          <UButton
            label="Save"
            @click="patchSite({ branding })"
          />
        </div>
      </fieldset>
    </UCard>

    <UCard v-else-if="tab === 'sending'">
      <div class="space-y-4">
        <p class="text-sm text-(--ui-text-muted)">
          Reminders and site emails are sent from a Prayer.Tools address with your site's name. Replies go to you.
        </p>
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="From name">
            <UInput
              v-model="identity.from_name"
              :placeholder="site.org.name"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Sending address"
            help="Before the @ of the Prayer.Tools sending domain."
          >
            <UInput
              v-model="identity.from_local"
              :placeholder="site.org.slug"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Reply-to address">
            <UInput
              v-model="identity.reply_to"
              type="email"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Logo in emails (URL)">
            <UInput
              v-model="identity.logo_url"
              :placeholder="branding.logo_url"
              class="w-full"
            />
          </UFormField>
        </div>
        <PtTranslatableInput
          v-model="signature"
          :languages="site.site.languages"
          :default-language="site.site.default_language"
          label="Signature"
          multiline
        />
        <UAlert
          color="neutral"
          variant="soft"
          icon="i-lucide-info"
          description="Sending from your own domain (with DKIM/SPF records) is planned; for now all mail uses the Prayer.Tools domain so bounces and complaints are tracked."
        />
        <div class="flex justify-end">
          <UButton
            label="Save"
            @click="patchSite({ email_identity: { ...identity, signature } })"
          />
        </div>
      </div>
    </UCard>

    <template v-else-if="tab === 'signup'">
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Questions at signup
          </h2>
          <p class="text-sm text-(--ui-text-muted)">
            Up to five. Answers show on each intercessor and in exports, and are never sent to analytics.
          </p>
        </template>
        <div class="space-y-4">
          <div
            v-for="f in signup?.fields ?? []"
            :key="f.id"
            class="rounded-md border border-(--ui-border) p-3 space-y-2"
          >
            <div class="flex items-center justify-between">
              <UBadge
                :label="f.kind === 'text' ? 'Short text' : f.kind === 'select' ? 'Dropdown' : 'Checkbox'"
                variant="soft"
              />
              <UButton
                v-if="can('pt.site.write')"
                size="xs"
                color="error"
                variant="ghost"
                label="Stop asking"
                @click="deleteField(f)"
              />
            </div>
            <PtTranslatableInput
              v-model="f.label"
              :languages="site.site.languages"
              :default-language="site.site.default_language"
              label="Question"
            />
            <div
              v-if="f.kind === 'select'"
              class="space-y-2 ps-4"
            >
              <PtTranslatableInput
                v-for="o in f.options"
                :key="o.key"
                v-model="o.label"
                :languages="site.site.languages"
                :default-language="site.site.default_language"
                :label="`Option ${o.key}`"
              />
            </div>
            <div class="flex items-center justify-between">
              <UCheckbox
                v-model="f.required"
                label="Required"
                :disabled="!can('pt.site.write')"
              />
              <UButton
                size="sm"
                label="Save"
                @click="saveField(f)"
              />
            </div>
          </div>
          <div
            v-if="can('pt.site.write') && (signup?.fields.length ?? 0) < 5"
            class="rounded-md border border-dashed border-(--ui-border-accented) p-3 space-y-3"
          >
            <URadioGroup
              v-model="newField.kind"
              :items="[{ value: 'text', label: 'Short text' }, { value: 'select', label: 'Dropdown' }, { value: 'checkbox', label: 'Checkbox' }]"
              orientation="horizontal"
            />
            <PtTranslatableInput
              v-model="newField.label"
              :languages="site.site.languages"
              :default-language="site.site.default_language"
              label="New question"
            />
            <div
              v-if="newField.kind === 'select'"
              class="space-y-2"
            >
              <PtTranslatableInput
                v-for="o in newField.options"
                :key="o.key"
                v-model="o.label"
                :languages="site.site.languages"
                :default-language="site.site.default_language"
                :label="`Option ${o.key}`"
              />
              <UButton
                size="xs"
                variant="soft"
                icon="i-lucide-plus"
                label="Add option"
                @click="addOption"
              />
            </div>
            <div class="flex items-center justify-between">
              <UCheckbox
                v-model="newField.required"
                label="Required"
              />
              <UButton
                label="Add question"
                @click="createField"
              />
            </div>
          </div>
        </div>
      </UCard>
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Your own consent options
          </h2>
          <p class="text-sm text-(--ui-text-muted)">
            Offered unchecked at signup, next to “Updates from this site” and “News from Prayer.Tools”. Everyone who ticks one
            becomes an audience for site emails.
          </p>
        </template>
        <div class="space-y-3">
          <div
            v-for="o in signup?.consentOptions ?? []"
            :key="o.id"
            class="rounded-md border border-(--ui-border) p-3 space-y-2"
          >
            <PtTranslatableInput
              v-model="o.label"
              :languages="site.site.languages"
              :default-language="site.site.default_language"
              label="Wording"
            />
            <div class="flex items-center justify-between">
              <USwitch
                :model-value="o.active"
                label="Offered at signup"
                :disabled="!can('pt.site.write')"
                @update:model-value="(v) => saveOption(o, { active: v })"
              />
              <UButton
                size="sm"
                label="Save"
                @click="saveOption(o, { label: o.label })"
              />
            </div>
          </div>
          <div
            v-if="can('pt.site.write')"
            class="flex items-end gap-2"
          >
            <PtTranslatableInput
              v-model="newOption"
              :languages="site.site.languages"
              :default-language="site.site.default_language"
              label="New option"
              placeholder="Send me news about our mission trips"
              class="flex-1"
            />
            <UButton
              label="Add"
              @click="createOption"
            />
          </div>
        </div>
      </UCard>
    </template>

    <UCard v-else-if="tab === 'wording'">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-semibold">
              Wording on your site
            </h2>
            <p class="text-sm text-(--ui-text-muted)">
              Leave a field empty to use the standard wording.
            </p>
          </div>
          <USelect
            v-model="wordingLang"
            :items="site.site.languages.map(l => ({ label: languageName(meta, l), value: l }))"
            class="w-44"
          />
        </div>
      </template>
      <div class="space-y-3">
        <div
          v-for="e in EDITABLE"
          :key="e.key"
          class="flex items-end gap-2"
        >
          <UFormField
            :label="e.label"
            class="flex-1"
          >
            <UTextarea
              v-if="e.multiline"
              v-model="wording[e.key]"
              :rows="2"
              autoresize
              placeholder="Standard wording"
              class="w-full"
            />
            <UInput
              v-else
              v-model="wording[e.key]"
              placeholder="Standard wording"
              class="w-full"
            />
          </UFormField>
          <UButton
            size="sm"
            variant="soft"
            label="Save"
            @click="saveWording(e.key)"
          />
        </div>
      </div>
    </UCard>

    <UCard v-else-if="tab === 'behaviour'">
      <fieldset
        :disabled="!can('pt.site.write')"
        class="space-y-4"
      >
        <template
          v-for="(def, key) in meta?.settingDefaults ?? {}"
          :key="key"
        >
          <USwitch
            v-if="typeof def === 'boolean'"
            v-model="settings[key]"
            :label="PT_LABELS.setting[key] ?? key"
          />
          <UFormField
            v-else
            :label="PT_LABELS.setting[key] ?? key"
          >
            <UInputNumber
              v-model="settings[key]"
              :min="1"
              :max="240"
            />
          </UFormField>
        </template>
        <div class="flex justify-end">
          <UButton
            label="Save"
            @click="patchSite({ settings })"
          />
        </div>
      </fieldset>
    </UCard>

    <template v-else-if="tab === 'status'">
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Status
          </h2>
        </template>
        <div class="space-y-3 text-sm">
          <p>
            This site is <strong>{{ PT_LABELS.siteStatus[site.site.status] }}</strong>.
            <template v-if="site.site.status === 'draft'">
              Only people with the preview link can see it.
            </template>
            <template v-else-if="site.site.status === 'archived'">
              Visitors see a short “this campaign has ended” page; no signup and no reminders.
            </template>
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="site.site.status === 'draft'"
              label="Publish"
              icon="i-lucide-rocket"
              @click="setStatus('publish')"
            />
            <UButton
              v-if="site.site.status === 'published'"
              label="Archive"
              color="warning"
              variant="soft"
              @click="setStatus('archive')"
            />
            <UButton
              v-if="site.site.status === 'archived'"
              label="Un-archive"
              variant="soft"
              @click="setStatus('unarchive')"
            />
            <UButton
              label="Get a preview link"
              variant="outline"
              icon="i-lucide-eye"
              @click="preview"
            />
          </div>
          <UInput
            v-if="previewUrl"
            :model-value="previewUrl"
            readonly
            class="w-full"
          />
        </div>
      </UCard>
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Directory
          </h2>
        </template>
        <div class="space-y-3 text-sm">
          <p>
            List your site in the Prayer.Tools app's directory so people can find it. A Prayer.Tools operator approves listings.
            Your site stays reachable by its link either way.
          </p>
          <p v-if="site.directory">
            Status: <UBadge
              :label="PT_LABELS.directoryStatus[site.directory.status]"
              :color="ptStatusColor(site.directory.status)"
              variant="subtle"
            />
          </p>
          <UButton
            v-if="!site.directory"
            label="Ask to be listed"
            variant="soft"
            :disabled="site.site.status !== 'published'"
            @click="directory(true)"
          />
          <UButton
            v-else
            label="Remove from the directory"
            color="neutral"
            variant="soft"
            @click="directory(false)"
          />
        </div>
      </UCard>
      <UCard v-if="exportsLog?.exports.length">
        <template #header>
          <h2 class="font-semibold">
            Intercessor exports
          </h2>
        </template>
        <ul class="text-sm space-y-1">
          <li
            v-for="e in exportsLog.exports"
            :key="e.id"
          >
            {{ ptFormatDate(e.created_at, { dateStyle: 'medium', timeStyle: 'short' }) }} — {{ e.display_name }} ({{ e.email }}), {{ e.row_count }} rows
          </li>
        </ul>
      </UCard>
      <UCard v-if="isOwner">
        <template #header>
          <h2 class="font-semibold text-(--ui-error)">
            Delete site
          </h2>
        </template>
        <p class="text-sm mb-3">
          Deletes the site, its campaigns, intercessors and stats. This can't be undone.
        </p>
        <UButton
          color="error"
          variant="soft"
          label="Delete this site"
          @click="deleteOpen = true"
        />
      </UCard>
    </template>

    <PtImagePicker
      :open="!!imagePicker"
      :language="site.site.default_language"
      @update:open="(v) => { if (!v) imagePicker = null }"
      @select="(a) => {
        const key = imagePicker === 'share' ? 'share_image_url' : `${imagePicker}_url`
        branding[key] = a.url
        if (imagePicker === 'image') { branding.image_alt = a.asset.alt ?? undefined; branding.image_credit = a.credit ?? undefined; branding.focal_x = a.asset.focal_x; branding.focal_y = a.asset.focal_y }
        imagePicker = null
      }"
    />

    <UModal
      v-model:open="deleteOpen"
      title="Delete this site?"
    >
      <template #body>
        <UFormField :label="`Type ${site.org.slug} to confirm`">
          <UInput
            v-model="deleteConfirm"
            class="w-full"
          />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="deleteOpen = false"
          />
          <UButton
            label="Delete forever"
            color="error"
            :disabled="deleteConfirm !== site.org.slug"
            @click="deleteSite"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
