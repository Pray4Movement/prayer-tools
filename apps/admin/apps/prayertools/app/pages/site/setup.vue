<script setup lang="ts">
// Onboarding, continued on the draft site: template and campaign setup,
// address and languages, content, landing page, look and publish. The
// current step is saved on the site, so setup can be resumed.
import type { SetupState } from '../../components/PtSetupForm.vue'

definePageMeta({ middleware: 'auth' })

const STEPS = ['setup', 'address', 'content', 'landing', 'publish'] as const
type Step = typeof STEPS[number]

const { data: site, refresh: refreshSite, can } = usePtSite()
const { data: meta } = usePtMeta()
const toast = usePtToast()
const route = useRoute()
const slug = computed(() => String(route.params.orgSlug))

const step = ref<Step>('setup')
watch(site, (s) => {
  const saved = s?.site.onboarding?.step as Step | undefined
  if (saved && STEPS.includes(saved) && step.value === 'setup') step.value = saved
}, { immediate: true })

async function go(next: Step) {
  step.value = next
  await $fetch('/api/pt/site', { method: 'PATCH', body: { onboarding: { step: next } } }).catch(() => {})
}

// ── Step: template + campaign setup ─────────────────────────────────────
const templateKey = ref('generic')
watch(site, s => { if (s?.site.template_key) templateKey.value = s.site.template_key }, { immediate: true })
const campaignName = ref('')
const setup = ref<SetupState>({ start_mode: 'date', start_date: null, end_mode: 'date', end_date: null, length_days: null, goal: 'people', cadence: 'daily', track_time: false, goal_target: 100 })
const existingCampaign = computed(() => site.value?.currentCampaign ?? null)

watch(existingCampaign, (c) => {
  if (!c) return
  campaignName.value = c.name
  setup.value = { start_mode: c.start_mode, start_date: c.start_date, end_mode: c.end_mode, end_date: c.end_date, length_days: c.length_days, goal: c.goal, cadence: c.cadence, track_time: c.track_time, goal_target: c.goal_target }
}, { immediate: true })

function chooseTemplate(key: string) {
  templateKey.value = key
  const t = meta.value?.templates.find(x => x.key === key)
  if (!t) return
  setup.value = { ...setup.value, ...(t.setup as Partial<SetupState>) }
  if (t.setup.length_days && setup.value.start_mode === 'date') setup.value.length_days = null
  if (!campaignName.value && site.value) {
    const year = (setup.value.start_date ?? new Date().toISOString()).slice(0, 4)
    campaignName.value = key === 'ramadan' ? `Ramadan ${year}` : site.value.org.name
  }
}

const savingSetup = ref(false)
async function saveSetup() {
  savingSetup.value = true
  try {
    await $fetch('/api/pt/site', { method: 'PATCH', body: { template_key: templateKey.value } })
    const body = { ...setup.value, name: campaignName.value || site.value?.org.name, template_key: templateKey.value }
    if (templateKey.value !== 'generic' && setup.value.start_mode === 'date' && !existingCampaign.value) delete (body as Record<string, unknown>).end_date
    if (existingCampaign.value) await $fetch(`/api/pt/campaigns/${existingCampaign.value.id}`, { method: 'PATCH', body })
    else await $fetch('/api/pt/campaigns', { method: 'POST', body })
    await refreshSite()
    await go('address')
  } catch (err) {
    toast.fail(err)
  } finally {
    savingSetup.value = false
  }
}

// ── Step: address + languages ────────────────────────────────────────────
const newSlug = ref('')
const languages = ref<string[]>(['en'])
const defaultLanguage = ref('en')
watch(site, (s) => {
  if (!s) return
  newSlug.value = s.org.slug
  languages.value = [...s.site.languages]
  defaultLanguage.value = s.site.default_language
}, { immediate: true })
const languageItems = computed(() => (meta.value?.languages ?? []).map(l => ({ label: `${l.name} — ${l.native}`, value: l.code })))
const slugState = ref<{ available: boolean, reason?: string, suggestion?: string } | null>(null)
let slugTimer: ReturnType<typeof setTimeout> | undefined
watch(newSlug, (value) => {
  clearTimeout(slugTimer)
  slugState.value = null
  if (!value || value === slug.value) return
  slugTimer = setTimeout(async () => {
    slugState.value = await $fetch('/api/pt/sites/slug-check', { query: { slug: value } })
  }, 400)
})
const slugError = computed(() => {
  const s = slugState.value
  if (!s || s.available) return undefined
  if (s.reason === 'taken') return `Taken${s.suggestion ? ` — try ${s.suggestion}` : ''}`
  if (s.reason === 'reserved') return 'This address is reserved.'
  return 'Use 3–40 lowercase letters, digits and single hyphens.'
})
const savingAddress = ref(false)
async function saveAddress() {
  savingAddress.value = true
  try {
    if (!languages.value.includes(defaultLanguage.value)) defaultLanguage.value = languages.value[0] ?? 'en'
    await $fetch('/api/pt/site', { method: 'PATCH', body: { languages: languages.value, default_language: defaultLanguage.value } })
    if (newSlug.value !== slug.value) {
      const res = await $fetch<{ slug: string }>('/api/pt/site/slug', { method: 'PUT', body: { slug: newSlug.value } })
      await $fetch('/api/pt/site', { method: 'PATCH', headers: { 'x-active-org': res.slug }, body: { onboarding: { step: 'content' } } })
      await navigateTo(`/@${res.slug}/site/setup`, { replace: true })
      return
    }
    await refreshSite()
    await go('content')
  } catch (err) {
    toast.fail(err)
  } finally {
    savingAddress.value = false
  }
}

// ── Step: content ────────────────────────────────────────────────────────
const { data: content, refresh: refreshContent } = useFetch<{ libraries: { siteLibraryId: string, libraryId: string | null, title: string, entryCount: number, missingLanguages: string[] }[] }>('/api/pt/content', {
  query: computed(() => ({ campaign: existingCampaign.value?.id })),
  key: computed(() => `pt-setup-content-${existingCampaign.value?.id}`),
  immediate: false
})
watch(() => [step.value, existingCampaign.value?.id], () => { if (step.value === 'content' && existingCampaign.value) refreshContent() }, { immediate: true })
async function useLibrary(libraryId: string) {
  try {
    await $fetch('/api/pt/content/libraries', { method: 'POST', body: { campaignId: existingCampaign.value?.id, libraryId } })
    await refreshContent()
    toast.ok('Added to your campaign')
  } catch (err) {
    toast.fail(err)
  }
}
const ownTitle = ref('')
async function createOwn() {
  try {
    await $fetch('/api/pt/content/libraries', { method: 'POST', body: { campaignId: existingCampaign.value?.id, title: ownTitle.value || 'Our prayer guide' } })
    ownTitle.value = ''
    await refreshContent()
    toast.ok('Created. Write the entries on the Prayer content page.')
  } catch (err) {
    toast.fail(err)
  }
}

// ── Step: landing ────────────────────────────────────────────────────────
const why = ref<Record<string, any> | null>(null)
const hidden = ref<string[]>([])
const showStories = ref(true)
watch(site, (s) => {
  if (!s) return
  why.value = s.site.landing?.why?.[s.site.default_language] ?? null
  hidden.value = [...(s.site.landing?.hidden ?? [])]
  showStories.value = s.site.landing?.stories !== false
}, { immediate: true })
const savingLanding = ref(false)
async function saveLanding() {
  savingLanding.value = true
  try {
    const landing = { ...(site.value?.site.landing ?? {}), why: { ...(site.value?.site.landing?.why ?? {}), [site.value!.site.default_language]: why.value }, hidden: hidden.value, stories: showStories.value }
    await $fetch('/api/pt/site', { method: 'PATCH', body: { landing } })
    await refreshSite()
    await go('publish')
  } catch (err) {
    toast.fail(err)
  } finally {
    savingLanding.value = false
  }
}

// ── Step: look and publish ──────────────────────────────────────────────
const color = ref('#2f6f5e')
const image = ref<{ url: string, alt: string, credit: string | null } | null>(null)
const logo = ref<{ url: string, assetId: string | null } | null>(null)
const fromName = ref('')
const replyTo = ref('')
const pickerOpen = ref(false)
const pickerFor = ref<'image' | 'logo'>('image')
function openPicker(target: 'image' | 'logo') {
  pickerFor.value = target
  pickerOpen.value = true
}
watch(site, (s) => {
  if (!s) return
  color.value = s.site.branding?.color ?? s.brand.color
  image.value = s.site.branding?.image_url ? { url: s.site.branding.image_url, alt: s.site.branding.image_alt?.values?.[s.site.default_language] ?? '', credit: s.site.branding.image_credit ?? null } : null
  logo.value = s.site.branding?.logo_url ? { url: s.site.branding.logo_url, assetId: s.site.branding.logo_asset_id ?? null } : null
  fromName.value = s.site.email_identity?.from_name ?? ''
  replyTo.value = s.site.email_identity?.reply_to ?? ''
}, { immediate: true })
const preview = ref<string | null>(null)
const savingLook = ref(false)
async function saveLook() {
  savingLook.value = true
  try {
    const lang = site.value!.site.default_language
    await $fetch('/api/pt/site', {
      method: 'PATCH',
      body: {
        branding: { ...(site.value?.site.branding ?? {}), color: color.value, image_url: image.value?.url, image_alt: image.value ? { source: lang, values: { [lang]: image.value.alt } } : undefined, image_credit: image.value?.credit ?? undefined, logo_url: logo.value?.url, logo_asset_id: logo.value?.assetId ?? undefined },
        ...(can('pt.site.manage') ? { email_identity: { ...(site.value?.site.email_identity ?? {}), from_name: fromName.value || undefined, reply_to: replyTo.value || undefined } } : {})
      }
    })
    await refreshSite()
    toast.ok('Saved')
  } catch (err) {
    toast.fail(err)
  } finally {
    savingLook.value = false
  }
}
async function makePreview() {
  try {
    const res = await $fetch<{ url: string }>('/api/pt/site/preview-link', { method: 'POST' })
    preview.value = res.url
  } catch (err) {
    toast.fail(err)
  }
}
watch(step, (s) => {
  if (s === 'publish' && !preview.value) makePreview()
}, { immediate: true })
const checklist = computed(() => {
  const s = site.value
  if (!s) return []
  const desc = s.site.description?.values?.[s.site.default_language]
  return [
    { label: 'A campaign with dates and a goal', done: !!s.currentCampaign },
    { label: 'Prayer content for the campaign', done: (content.value?.libraries.length ?? 0) > 0 },
    { label: 'A description for the top of the page', done: !!desc },
    { label: 'A top image', done: !!s.site.branding?.image_url },
    { label: 'A reply-to address for emails', done: !!(s.site.email_identity?.reply_to || s.inboxAddress) },
    { label: 'Translations for every language', done: (content.value?.libraries ?? []).every(l => !l.missingLanguages.length) }
  ]
})
const publishing = ref(false)
async function publish() {
  publishing.value = true
  try {
    await saveLook()
    await $fetch('/api/pt/site/status', { method: 'POST', body: { action: 'publish' } })
    toast.ok('Your site is live', site.value?.url)
    await navigateTo(`/@${slug.value}/site/landing/share`)
  } catch (err) {
    toast.fail(err, 'Could not publish')
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        Set up {{ site?.org.name }}
      </h1>
      <UBadge
        :label="PT_LABELS.siteStatus[site?.site.status ?? 'draft']"
        :color="ptStatusColor(site?.site.status ?? 'draft')"
        variant="subtle"
      />
    </div>
    <UTabs
      :model-value="step"
      :items="[
        { label: 'Campaign', value: 'setup', icon: 'i-lucide-calendar-range' },
        { label: 'Address & languages', value: 'address', icon: 'i-lucide-globe' },
        { label: 'Content', value: 'content', icon: 'i-lucide-book-open', disabled: !existingCampaign },
        { label: 'Landing page', value: 'landing', icon: 'i-lucide-panels-top-left' },
        { label: 'Look & publish', value: 'publish', icon: 'i-lucide-rocket' }
      ]"
      :content="false"
      class="w-full"
      @update:model-value="(v) => go(v as Step)"
    />

    <UCard v-if="step === 'setup'">
      <template #header>
        <h2 class="font-semibold">
          Choose a template
        </h2>
        <p class="text-sm text-(--ui-text-muted)">
          A template fills in sensible answers. You can change them later.
        </p>
      </template>
      <div class="space-y-6">
        <div class="grid sm:grid-cols-2 gap-3">
          <button
            v-for="t in meta?.templates ?? []"
            :key="t.key"
            type="button"
            class="text-start rounded-lg border p-3 transition focus-visible:ring-2 focus-visible:ring-(--ui-primary)"
            :class="templateKey === t.key ? 'border-(--ui-primary) ring-1 ring-(--ui-primary) bg-(--ui-bg-elevated)' : 'border-(--ui-border) hover:bg-(--ui-bg-elevated)'"
            @click="chooseTemplate(t.key)"
          >
            <span class="flex items-center gap-2">
              <UIcon
                :name="PT_TEMPLATE_ICONS[t.key] ?? 'i-lucide-sparkles'"
                class="size-5 shrink-0 text-(--ui-primary)"
              />
              <span class="font-medium">{{ PT_LABELS.template[t.key] }}</span>
            </span>
            <span class="block text-sm text-(--ui-text-muted) mt-1">{{ PT_LABELS.templateDescription[t.key] }}</span>
          </button>
        </div>
        <UFormField
          label="Campaign name"
          help="People see this, e.g. “Ramadan 2027”."
        >
          <UInput
            v-model="campaignName"
            class="w-full"
          />
        </UFormField>
        <PtSetupForm
          v-model="setup"
          :template-key="templateKey"
        />
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            label="Save and continue"
            :loading="savingSetup"
            @click="saveSetup"
          />
        </div>
      </template>
    </UCard>

    <UCard v-else-if="step === 'address'">
      <template #header>
        <h2 class="font-semibold">
          Address and languages
        </h2>
      </template>
      <div class="space-y-5">
        <UFormField
          label="Address"
          help="Changing it later breaks links people already have."
          :error="slugError"
        >
          <UInput
            v-model="newSlug"
            class="w-full"
          >
            <template #trailing>
              <span class="text-xs text-(--ui-text-muted)">.{{ meta?.siteBaseHost }}</span>
            </template>
          </UInput>
        </UFormField>
        <UFormField
          label="Languages the site runs in"
          help="Visitors can switch between these; content should exist in each."
        >
          <USelectMenu
            v-model="languages"
            :items="languageItems"
            value-key="value"
            multiple
            class="w-full"
          />
        </UFormField>
        <UFormField label="Default language">
          <USelect
            v-model="defaultLanguage"
            :items="languageItems.filter(l => languages.includes(l.value))"
            class="w-full sm:w-72"
          />
        </UFormField>
        <p class="text-sm text-(--ui-text-muted)">
          You can add your own domain after publishing, under Domains.
        </p>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            label="Save and continue"
            :loading="savingAddress"
            :disabled="!languages.length || !newSlug || (newSlug !== slug && !slugState?.available)"
            @click="saveAddress"
          />
        </div>
      </template>
    </UCard>

    <UCard v-else-if="step === 'content'">
      <template #header>
        <h2 class="font-semibold">
          Prayer content
        </h2>
        <p class="text-sm text-(--ui-text-muted)">
          Use a library as it is (fixes and new translations reach you automatically), change it to suit
          your site, or write your own.
        </p>
      </template>
      <div class="space-y-6">
        <div
          v-if="content?.libraries.length"
          class="space-y-2"
        >
          <h3 class="text-sm font-medium">
            In your campaign
          </h3>
          <div
            v-for="l in content.libraries"
            :key="l.siteLibraryId"
            class="flex items-center justify-between rounded-md border border-(--ui-border) px-3 py-2 text-sm"
          >
            <span>{{ l.title }} · {{ l.entryCount }} entries</span>
            <UBadge
              v-if="l.missingLanguages.length"
              color="warning"
              variant="soft"
              :label="`Missing: ${l.missingLanguages.map(x => languageName(meta, x)).join(', ')}`"
            />
          </div>
        </div>
        <PtLibraryCatalog
          :template="templateKey"
          :cadence="existingCampaign?.cadence"
          :site-languages="site?.site.languages ?? []"
          :used-ids="(content?.libraries ?? []).map(l => l.libraryId).filter(Boolean) as string[]"
          @use="useLibrary"
        />
        <USeparator label="or" />
        <div class="flex flex-wrap items-end gap-2">
          <UFormField
            label="Write your own content"
            class="flex-1"
          >
            <UInput
              v-model="ownTitle"
              placeholder="Our prayer guide"
              class="w-full"
            />
          </UFormField>
          <UButton
            label="Create"
            variant="soft"
            @click="createOwn"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            label="Continue"
            @click="go('landing')"
          />
        </div>
      </template>
    </UCard>

    <UCard v-else-if="step === 'landing'">
      <template #header>
        <h2 class="font-semibold">
          Landing page
        </h2>
        <p class="text-sm text-(--ui-text-muted)">
          The page has fixed sections. Tell people why this campaign matters; hide what you don't need.
          More options are on the Landing page screen.
        </p>
      </template>
      <div class="space-y-5">
        <UFormField label="Why this campaign">
          <PtRichEditor
            v-model="why"
            placeholder="Why should people pray? Who are you praying for?"
          />
        </UFormField>
        <UFormField label="Sections to show">
          <div class="grid sm:grid-cols-2 gap-2">
            <UCheckbox
              v-for="s in meta?.landing.hideable ?? []"
              :key="s"
              :model-value="!hidden.includes(s)"
              :label="PT_LABELS.landingSection[s]"
              @update:model-value="(v) => { hidden = v ? hidden.filter(x => x !== s) : [...hidden, s] }"
            />
          </div>
        </UFormField>
        <USwitch
          v-model="showStories"
          label="Show stories you choose to publish"
          description="Stories are optional; they come from people who pray and only appear when you add them."
        />
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            label="Save and continue"
            :loading="savingLanding"
            @click="saveLanding"
          />
        </div>
      </template>
    </UCard>

    <UCard v-else-if="step === 'publish'">
      <template #header>
        <h2 class="font-semibold">
          Look and publish
        </h2>
      </template>
      <div class="space-y-6">
        <PtColorField v-model="color" />
        <div class="grid sm:grid-cols-2 gap-6">
          <UFormField
            label="Top image"
            description="A wide photo shown at the top of your page."
          >
            <div class="space-y-2">
              <img
                v-if="image"
                :src="image.url"
                :alt="image.alt"
                class="rounded-md max-h-32 object-cover"
              >
              <UButton
                :label="image ? 'Change image' : 'Choose image'"
                icon="i-lucide-image"
                variant="soft"
                @click="openPicker('image')"
              />
            </div>
          </UFormField>
          <UFormField
            label="Logo (optional)"
            description="Shown in emails and the site header."
          >
            <div class="space-y-2">
              <img
                v-if="logo"
                :src="logo.url"
                alt=""
                class="rounded-md max-h-20 object-contain"
              >
              <div class="flex flex-wrap gap-2">
                <UButton
                  :label="logo ? 'Change logo' : 'Choose logo'"
                  icon="i-lucide-image"
                  variant="soft"
                  @click="openPicker('logo')"
                />
                <UButton
                  v-if="logo"
                  label="Remove"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  @click="logo = null"
                />
              </div>
            </div>
          </UFormField>
        </div>
        <div
          v-if="can('pt.site.manage')"
          class="grid sm:grid-cols-2 gap-4"
        >
          <UFormField
            label="Emails come from"
            :help="`Shown as the sender name. Default: ${site?.org.name}`"
          >
            <UInput
              v-model="fromName"
              :placeholder="site?.org.name"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Replies go to"
            :help="site?.inboxAddress ? `Leave empty to get replies in this site's inbox (${site.inboxAddress}), or give your own address.` : 'Your email address, for people who reply to reminders.'"
          >
            <UInput
              v-model="replyTo"
              type="email"
              :placeholder="site?.inboxAddress ?? undefined"
              class="w-full"
            />
          </UFormField>
        </div>
        <div>
          <h3 class="text-sm font-medium mb-2">
            Launch checklist
          </h3>
          <ul class="space-y-1 text-sm">
            <li
              v-for="c in checklist"
              :key="c.label"
              class="flex items-center gap-2"
            >
              <UIcon
                :name="c.done ? 'i-lucide-circle-check' : 'i-lucide-circle'"
                :class="c.done ? 'text-(--ui-success)' : 'text-(--ui-text-dimmed)'"
              />
              {{ c.label }}
            </li>
          </ul>
        </div>
        <div
          v-if="preview"
          class="space-y-2"
        >
          <h3 class="text-sm font-medium">
            Preview
          </h3>
          <div class="flex flex-col sm:flex-row gap-6 items-start">
            <PtQrCode
              :value="preview"
              :size="150"
            />
            <div class="space-y-3 text-sm">
              <p class="text-(--ui-text-muted)">
                Scan the code to open the draft on your phone, or open it here. Only people with this link can
                see the draft. Save to see your latest changes.
              </p>
              <UButton
                :to="preview"
                target="_blank"
                icon="i-lucide-external-link"
                color="neutral"
                variant="outline"
                label="Open preview"
              />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between">
          <UButton
            label="Save"
            color="neutral"
            variant="outline"
            :loading="savingLook"
            @click="saveLook"
          />
          <UButton
            v-if="can('pt.site.manage')"
            label="Publish"
            icon="i-lucide-rocket"
            :loading="publishing"
            :disabled="!existingCampaign"
            @click="publish"
          />
        </div>
      </template>
    </UCard>

    <PtImagePicker
      v-model:open="pickerOpen"
      :language="site?.site.default_language"
      @select="(a) => { if (pickerFor === 'logo') logo = { url: a.url, assetId: a.asset.id }; else image = { url: a.url, alt: a.alt, credit: a.credit }; pickerOpen = false }"
    />
  </div>
</template>
