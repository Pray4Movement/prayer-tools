<script setup lang="ts">
// Onboarding, first part: what a site and a campaign are, then about the
// site. Creating it here makes a draft; the rest of setup continues on the
// site (and can be resumed later from Your sites).
definePageMeta({ middleware: 'auth' })

const step = ref<'intro' | 'about'>('intro')
const { data: meta } = usePtMeta()
const toast = usePtToast()

const form = reactive({
  name: '',
  slug: '',
  description: '',
  purpose: 'place',
  place_name: '',
  people_group: '',
  latitude: null as number | null,
  longitude: null as number | null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  turnstile: ''
})
const slugTouched = ref(false)
const slugState = ref<{ available: boolean, reason?: string, suggestion?: string } | null>(null)
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const geocoding = ref(false)

const purposeItems = Object.entries(PT_LABELS.purpose).map(([value, label]) => ({ value, label }))

let slugTimer: ReturnType<typeof setTimeout> | undefined
watch(() => form.name, (name) => {
  if (slugTouched.value) return
  clearTimeout(slugTimer)
  slugTimer = setTimeout(async () => {
    if (!name.trim()) return
    const res = await $fetch<{ slug: string, available: boolean, suggestion?: string }>('/api/pt/sites/slug-check', { query: { name } })
    form.slug = res.available ? res.slug : (res.suggestion ?? res.slug)
    slugState.value = { available: true }
  }, 400)
})
watch(() => form.slug, (slug) => {
  if (!slugTouched.value) return
  clearTimeout(slugTimer)
  slugTimer = setTimeout(async () => {
    if (!slug) return
    slugState.value = await $fetch('/api/pt/sites/slug-check', { query: { slug } })
  }, 400)
})

async function findPlace() {
  const query = form.place_name || form.people_group || form.name
  if (!query) return
  geocoding.value = true
  try {
    const res = await $fetch<{ lat: string, lon: string }[]>('https://nominatim.openstreetmap.org/search', { query: { q: query, format: 'json', limit: 1 } })
    if (res[0]) {
      form.latitude = Math.round(Number(res[0].lat) * 1e4) / 1e4
      form.longitude = Math.round(Number(res[0].lon) * 1e4) / 1e4
    } else {
      toast.fail(new Error('No match found. Enter the coordinates yourself.'), 'Not found')
    }
  } catch (err) {
    toast.fail(err, 'Lookup failed')
  } finally {
    geocoding.value = false
  }
}

async function create() {
  errors.value = {}
  saving.value = true
  try {
    const site = await $fetch<{ slug: string }>('/api/pt/sites', {
      method: 'POST',
      body: { ...form, languages: ['en'], default_language: 'en', template_key: 'generic' }
    })
    await navigateTo(`/@${site.slug}/site/setup`)
  } catch (err) {
    const data = (err as { data?: { data?: { errors?: Record<string, string> } } }).data?.data
    if (data?.errors) errors.value = data.errors
    toast.fail(err, 'Could not create the site')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <UStepper
      :model-value="step === 'intro' ? 0 : 1"
      :items="[{ title: 'Sites and campaigns' }, { title: 'About the site' }, { title: 'Campaign setup' }, { title: 'Address and languages' }, { title: 'Content' }, { title: 'Landing page' }, { title: 'Look and publish' }]"
      size="xs"
      disabled
      class="w-full"
    />

    <UCard v-if="step === 'intro'">
      <template #header>
        <h1 class="text-xl font-semibold">
          Before you start
        </h1>
      </template>
      <div class="space-y-4 text-sm leading-6">
        <div class="flex gap-3">
          <UIcon
            name="i-lucide-house"
            class="size-6 shrink-0 text-(--ui-primary)"
          />
          <p>
            <strong>A site</strong> is the long-lived home of your prayer effort: its address
            (<code>your-name.{{ meta?.siteBaseHost ?? 'prayer.tools' }}</code> or your own domain), your team,
            its look, its languages, its landing page and the people who pray with you.
          </p>
        </div>
        <div class="flex gap-3">
          <UIcon
            name="i-lucide-calendar-range"
            class="size-6 shrink-0 text-(--ui-primary)"
          />
          <p>
            <strong>A campaign</strong> is one run of it with dates, prayer content and a goal —
            for example Ramadan 2026. Next year you relaunch: a new campaign on the same site, and the
            people who prayed before can be invited back. Past campaigns stay online with their results.
          </p>
        </div>
        <div class="flex gap-3">
          <UIcon
            name="i-lucide-eye-off"
            class="size-6 shrink-0 text-(--ui-primary)"
          />
          <p>
            Nothing is public until you publish. You can stop at any point and continue later.
          </p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            label="Describe your site"
            icon="i-lucide-arrow-right"
            trailing
            @click="step = 'about'"
          />
        </div>
      </template>
    </UCard>

    <UCard v-else>
      <template #header>
        <h1 class="text-xl font-semibold">
          About the site
        </h1>
      </template>
      <div class="space-y-5">
        <UFormField
          label="Name"
          :error="errors.name"
          required
        >
          <UInput
            v-model="form.name"
            placeholder="Pray for Tunis"
            class="w-full"
            autofocus
          />
        </UFormField>
        <UFormField
          label="Address"
          :error="errors.slug || (slugState && !slugState.available ? (slugState.reason === 'taken' ? `Taken${slugState.suggestion ? ` — try ${slugState.suggestion}` : ''}` : 'Not allowed') : undefined)"
          help="You can add your own domain later."
          required
        >
          <UInput
            v-model="form.slug"
            class="w-full"
            @focus="slugTouched = true"
          >
            <template #trailing>
              <span class="text-xs text-(--ui-text-muted)">.{{ meta?.siteBaseHost }}</span>
            </template>
          </UInput>
        </UFormField>
        <UFormField
          label="Description"
          help="A sentence or two for the top of your landing page."
        >
          <UTextarea
            v-model="form.description"
            :rows="3"
            autoresize
            class="w-full"
          />
        </UFormField>
        <UFormField label="What are you praying for?">
          <URadioGroup
            v-model="form.purpose"
            :items="purposeItems"
            orientation="horizontal"
          />
        </UFormField>
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="Place">
            <UInput
              v-model="form.place_name"
              placeholder="Tunis, Tunisia"
              class="w-full"
            />
          </UFormField>
          <UFormField label="People group (optional)">
            <UInput
              v-model="form.people_group"
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField
          label="Location"
          help="Where people are praying for. It places your prayers on the Prayer.Tools map."
        >
          <div class="flex flex-wrap items-center gap-2">
            <UInputNumber
              v-model="form.latitude"
              placeholder="Latitude"
              :step="0.0001"
              :min="-90"
              :max="90"
              class="w-36"
            />
            <UInputNumber
              v-model="form.longitude"
              placeholder="Longitude"
              :step="0.0001"
              :min="-180"
              :max="180"
              class="w-36"
            />
            <UButton
              label="Find from the place"
              icon="i-lucide-map-pin"
              variant="soft"
              :loading="geocoding"
              @click="findPlace"
            />
          </div>
        </UFormField>
        <UFormField
          label="Timezone"
          help="Campaign days begin at midnight in this timezone."
        >
          <USelectMenu
            v-model="form.timezone"
            :items="ptTimezones()"
            class="w-full sm:w-80"
          />
        </UFormField>
      </div>
      <template #footer>
        <div class="flex justify-between">
          <UButton
            label="Back"
            color="neutral"
            variant="ghost"
            @click="step = 'intro'"
          />
          <UButton
            label="Create draft site"
            icon="i-lucide-arrow-right"
            trailing
            :loading="saving"
            :disabled="form.name.trim().length < 2 || !form.slug"
            @click="create"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
