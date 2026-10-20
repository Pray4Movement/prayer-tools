<script setup lang="ts">
// Onboarding, first part: what a site and a campaign are, then about the
// site. Creating it here makes a draft; the rest of setup continues on the
// site (and can be resumed later from Your sites).
import type { PtLocation } from '../../../apps/prayertools/app/components/PtLocationSearch.vue'

definePageMeta({ middleware: 'auth' })

const step = ref<'intro' | 'about'>('intro')
const { data: meta } = usePtMeta()
const toast = usePtToast()

const form = reactive({
  name: '',
  description: '',
  purpose: 'place',
  people_group: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  turnstile: ''
})
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const location = ref<PtLocation | null>(null)
const turnstile = ref<{ reset: () => void } | null>(null)

const introCards = computed(() => [
  { icon: 'i-lucide-globe', title: 'Its own website', text: `At your-site.${meta.value?.siteBaseHost ?? 'prayer.tools'} (or your own domain), in the languages you choose.` },
  { icon: 'i-lucide-bell-ring', title: 'People sign up to pray', text: 'They choose when to be reminded and get an email (or app notification) at that time.' },
  { icon: 'i-lucide-book-open', title: 'Daily prayer content', text: 'Guided prayers from our libraries, which you can use as they are or adapt, or your own.' },
  { icon: 'i-lucide-chart-line', title: 'You see it grow', text: 'People signed up, prayer time and coverage, and stories from those praying.' }
])
const purposeItems = Object.entries(PT_LABELS.purpose).map(([value, label]) => ({ value, label, description: PT_LABELS.purposeDescription[value] }))

async function create() {
  errors.value = {}
  saving.value = true
  try {
    const site = await $fetch<{ slug: string }>('/api/pt/sites', {
      method: 'POST',
      body: {
        ...form,
        people_group: form.purpose === 'people_group' ? form.people_group : '',
        place_name: location.value?.name ?? null,
        latitude: location.value?.latitude ?? null,
        longitude: location.value?.longitude ?? null,
        languages: ['en'],
        default_language: 'en',
        template_key: 'generic'
      }
    })
    await navigateTo(`/@${site.slug}/site/setup`)
  } catch (err) {
    const data = (err as { data?: { data?: { errors?: Record<string, string> } } }).data?.data
    if (data?.errors) errors.value = data.errors
    turnstile.value?.reset()
    toast.fail(err, 'Could not create the site')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6 py-4">
    <div class="flex items-center justify-between gap-4">
      <UButton
        to="/orgs"
        variant="ghost"
        color="neutral"
        icon="i-lucide-arrow-left"
        label="Your sites"
      />
    </div>
    <UStepper
      :model-value="step === 'intro' ? 0 : 1"
      :items="[{ title: 'Sites and campaigns' }, { title: 'About the site' }, { title: 'Campaign setup' }, { title: 'Address and languages' }, { title: 'Content' }, { title: 'Landing page' }, { title: 'Look and publish' }]"
      size="xs"
      disabled
      class="w-full"
    />

    <div
      v-if="step === 'intro'"
      class="space-y-4"
    >
      <h1 class="text-3xl font-bold">
        Your site and its campaigns
      </h1>
      <p class="text-lg text-(--ui-text-muted)">
        Your <strong>site</strong> is your prayer website for one place, people group or event: its address, look, languages, team and the people who pray.
        A <strong>campaign</strong> is one round of prayer on it, with dates and a goal — like Ramadan 2026. When one ends, you can relaunch the next on the same site, and the people who prayed are invited back.
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <UCard
          v-for="c in introCards"
          :key="c.title"
        >
          <div class="flex gap-3">
            <UIcon
              :name="c.icon"
              class="size-6 text-(--ui-primary) shrink-0"
            />
            <div>
              <p class="font-medium">
                {{ c.title }}
              </p>
              <p class="text-sm text-(--ui-text-muted)">
                {{ c.text }}
              </p>
            </div>
          </div>
        </UCard>
      </div>
      <p class="text-sm text-(--ui-text-muted)">
        It takes a few minutes to set up. Your site stays a private draft until you publish it, and you can stop and come back at any time.
      </p>
      <UButton
        size="lg"
        trailing-icon="i-lucide-arrow-right"
        label="Let's start"
        @click="step = 'about'"
      />
    </div>

    <form
      v-else
      class="space-y-6"
      @submit.prevent="create"
    >
      <div>
        <h1 class="text-3xl font-bold">
          About the site
        </h1>
        <p class="text-(--ui-text-muted) mt-1">
          You can change all of this later.
        </p>
      </div>
      <UFormField
        label="Site name"
        :error="errors.name"
        required
      >
        <UInput
          v-model="form.name"
          size="lg"
          placeholder="e.g. 30 Days of Prayer for Istanbul"
          class="w-full"
          autofocus
        />
      </UFormField>
      <UFormField
        label="Short description"
        description="A sentence or two for the top of your landing page."
      >
        <UTextarea
          v-model="form.description"
          :rows="2"
          autoresize
          class="w-full"
        />
      </UFormField>
      <UFormField label="What are you praying for?">
        <URadioGroup
          v-model="form.purpose"
          :items="purposeItems"
          variant="card"
          orientation="horizontal"
          class="w-full"
          :ui="{ fieldset: 'grid grid-cols-1 sm:grid-cols-2 gap-2' }"
        />
      </UFormField>
      <UFormField
        v-if="form.purpose === 'people_group'"
        label="Which people group?"
      >
        <UInput
          v-model="form.people_group"
          placeholder="e.g. the Kurds of eastern Turkey"
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="Location"
        description="Where the people you pray for are. It places your site on the Prayer.Tools map."
      >
        <PtLocationSearch v-model="location" />
      </UFormField>
      <UFormField
        label="Timezone"
        description="Campaign days begin at midnight in this timezone."
      >
        <USelectMenu
          v-model="form.timezone"
          :items="ptTimezones()"
          class="w-full sm:w-80"
        />
      </UFormField>
      <PtTurnstile
        ref="turnstile"
        v-model="form.turnstile"
        :site-key="meta?.turnstileSiteKey || null"
      />
      <div class="flex items-center gap-3">
        <UButton
          type="submit"
          size="lg"
          label="Create site"
          trailing-icon="i-lucide-arrow-right"
          :loading="saving"
          :disabled="form.name.trim().length < 2 || (!!meta?.turnstileSiteKey && !form.turnstile)"
        />
        <UButton
          label="Back"
          color="neutral"
          variant="ghost"
          @click="step = 'intro'"
        />
      </div>
    </form>
  </div>
</template>
