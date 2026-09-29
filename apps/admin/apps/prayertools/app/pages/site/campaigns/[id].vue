<script setup lang="ts">
import type { SetupState } from '../../../components/PtSetupForm.vue'
import type { TranslatableText } from '@prayertools/shared/db/schema'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: site, can } = usePtSite()
const toast = usePtToast()
const { data, refresh } = useFetch<{ campaign: Record<string, any>, libraries: { siteLibraryId: string, title: string, entryCount: number }[] }>(() => `/api/pt/campaigns/${id.value}`, { key: computed(() => `pt-campaign-${id.value}`) })

const form = reactive({ name: '', slug: '', timezone: 'UTC' })
const setup = ref<SetupState>({ start_mode: 'date', start_date: null, end_mode: 'date', end_date: null, length_days: null, goal: 'people', cadence: 'daily', track_time: false, goal_target: null })
const endMessage = ref<TranslatableText | null>(null)
const ctaLabel = ref<TranslatableText | null>(null)
const ctaUrl = ref('')
watch(data, (d) => {
  const c = d?.campaign
  if (!c) return
  form.name = c.name
  form.slug = c.slug
  form.timezone = c.timezone
  setup.value = { start_mode: c.start_mode, start_date: c.start_date, end_mode: c.end_mode, end_date: c.end_date, length_days: c.length_days, goal: c.goal, cadence: c.cadence, track_time: c.track_time, goal_target: c.goal_target }
  endMessage.value = c.end_message
  ctaLabel.value = c.cta?.label ?? null
  ctaUrl.value = c.cta?.url ?? ''
}, { immediate: true })

const campaignUrl = computed(() => site.value ? `${site.value.url}/${data.value?.campaign.slug}` : '')
const saving = ref(false)
async function save() {
  saving.value = true
  try {
    await $fetch(`/api/pt/campaigns/${id.value}`, {
      method: 'PATCH',
      body: { ...form, ...setup.value, end_message: endMessage.value, cta: ctaUrl.value ? { url: ctaUrl.value, label: ctaLabel.value } : {} }
    })
    await refresh()
    toast.ok('Campaign saved')
  } catch (err) {
    toast.fail(err)
  } finally {
    saving.value = false
  }
}

const confirmClose = ref(false)
async function close() {
  try {
    await $fetch(`/api/pt/campaigns/${id.value}/close`, { method: 'POST' })
    confirmClose.value = false
    await refresh()
    toast.ok('Campaign closed', 'Everyone in it will get the thank-you email.')
  } catch (err) {
    toast.fail(err)
  }
}
async function remove() {
  try {
    await $fetch(`/api/pt/campaigns/${id.value}`, { method: 'DELETE' })
    await navigateTo('/site/campaigns')
  } catch (err) {
    toast.fail(err, 'Could not delete')
  }
}
</script>

<template>
  <div
    v-if="data && site"
    class="max-w-3xl mx-auto space-y-6"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <UButton
          to="/site/campaigns"
          icon="i-lucide-arrow-left"
          variant="link"
          color="neutral"
          label="Campaigns"
          class="px-0"
        />
        <h1 class="text-2xl font-semibold">
          {{ data.campaign.name }}
        </h1>
        <p class="text-sm text-(--ui-text-muted)">
          <a
            :href="campaignUrl"
            target="_blank"
            rel="noopener"
            class="hover:underline"
          >{{ campaignUrl.replace(/^https?:\/\//, '') }}</a>
        </p>
      </div>
      <UBadge
        :label="PT_LABELS.campaignStatus[data.campaign.status]"
        :color="ptStatusColor(data.campaign.status)"
        variant="subtle"
        size="lg"
      />
    </div>

    <div class="grid sm:grid-cols-3 gap-3">
      <UCard>
        <p class="text-xs text-(--ui-text-muted)">
          People
        </p>
        <p class="text-2xl font-semibold">
          {{ data.campaign.progress.people.toLocaleString() }}
        </p>
      </UCard>
      <UCard>
        <p class="text-xs text-(--ui-text-muted)">
          Goal
        </p>
        <p class="text-lg font-semibold">
          {{ PT_LABELS.goal[data.campaign.goal] }}
        </p>
        <UProgress
          v-if="data.campaign.progress.percent !== null"
          :model-value="data.campaign.progress.percent"
          size="sm"
        />
      </UCard>
      <UCard>
        <p class="text-xs text-(--ui-text-muted)">
          Content
        </p>
        <p class="text-lg font-semibold">
          {{ data.campaign.contentEntries }} entries
        </p>
        <p
          v-if="data.campaign.entries && data.campaign.contentEntries < data.campaign.entries"
          class="text-xs text-(--ui-warning)"
        >
          The campaign has {{ data.campaign.entries }} {{ data.campaign.cadence === 'weekly' ? 'weeks' : 'days' }}.
        </p>
        <UButton
          to="/site/content"
          size="xs"
          variant="link"
          label="Edit content"
          class="px-0"
        />
      </UCard>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Setup
        </h2>
      </template>
      <fieldset
        :disabled="!can('pt.campaigns.write')"
        class="space-y-6"
      >
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="Name">
            <UInput
              v-model="form.name"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Address"
            :help="`${site.url.replace(/^https?:\/\//, '')}/${form.slug}`"
          >
            <UInput
              v-model="form.slug"
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField
          label="Timezone"
          help="Campaign days begin at midnight here."
        >
          <USelectMenu
            v-model="form.timezone"
            :items="ptTimezones()"
            class="w-full sm:w-80"
          />
        </UFormField>
        <PtSetupForm
          v-model="setup"
          :template-key="data.campaign.template_key ?? 'generic'"
          :lock-template="false"
        />
      </fieldset>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          End of the campaign
        </h2>
        <p class="text-sm text-(--ui-text-muted)">
          Everyone in the campaign gets a thank-you email when it ends (in personal-start campaigns, each person when
          they reach the last day). Add your own message and a next step if you like.
        </p>
      </template>
      <div class="space-y-4">
        <PtTranslatableInput
          v-model="endMessage"
          :languages="site.site.languages"
          :default-language="site.site.default_language"
          label="Your message (optional)"
          multiline
        />
        <div class="grid sm:grid-cols-2 gap-4">
          <PtTranslatableInput
            v-model="ctaLabel"
            :languages="site.site.languages"
            :default-language="site.site.default_language"
            label="Button text"
            placeholder="Join the 12-day campaign"
          />
          <UFormField label="Button link">
            <UInput
              v-model="ctaUrl"
              type="url"
              placeholder="https://…"
              class="w-full"
            />
          </UFormField>
        </div>
        <UButton
          v-if="can('pt.email.send')"
          to="/site/emails"
          variant="link"
          label="Preview the thank-you email"
          class="px-0"
        />
      </div>
    </UCard>

    <div
      v-if="can('pt.campaigns.write')"
      class="flex flex-wrap justify-between gap-2"
    >
      <div class="flex gap-2">
        <UButton
          v-if="data.campaign.status !== 'ended'"
          color="warning"
          variant="soft"
          label="Close campaign now"
          @click="confirmClose = true"
        />
        <UButton
          v-if="data.campaign.progress.people === 0"
          color="error"
          variant="ghost"
          label="Delete"
          @click="remove"
        />
      </div>
      <UButton
        label="Save"
        :loading="saving"
        @click="save"
      />
    </div>

    <UModal
      v-model:open="confirmClose"
      title="Close this campaign?"
      description="The site will show the final results and invite people to be notified when it runs again. Everyone in the campaign gets the thank-you email."
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="confirmClose = false"
          />
          <UButton
            label="Close campaign"
            color="warning"
            @click="close"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
