<script setup lang="ts">
// New campaign, or a relaunch: a new campaign on the same site that starts
// from the previous one's answers and content.
import type { SetupState } from '../../../components/PtSetupForm.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const relaunchOf = computed(() => (typeof route.query.relaunch === 'string' ? route.query.relaunch : null))
const { data: site } = usePtSite()
const toast = usePtToast()
const { data: previous } = useFetch<{ campaign: Record<string, any> }>(() => `/api/pt/campaigns/${relaunchOf.value}`, { immediate: !!relaunchOf.value, key: `pt-relaunch-${relaunchOf.value}` })

const templateKey = ref('generic')
const name = ref('')
const setup = ref<SetupState>({ start_mode: 'date', start_date: null, end_mode: 'date', end_date: null, length_days: null, goal: 'people', cadence: 'daily', track_time: false, goal_target: null })
watch(site, s => { if (s?.site.template_key && !relaunchOf.value) templateKey.value = s.site.template_key }, { immediate: true })
watch(previous, (p) => {
  const c = p?.campaign
  if (!c) return
  templateKey.value = c.template_key ?? 'generic'
  name.value = c.name.replace(/\d{4}/, (y: string) => String(Number(y) + 1))
  setup.value = { start_mode: c.start_mode, start_date: null, end_mode: c.end_mode, end_date: null, length_days: c.length_days, goal: c.goal, cadence: c.cadence, track_time: c.track_time, goal_target: c.goal_target }
}, { immediate: true })

const saving = ref(false)
async function create() {
  saving.value = true
  try {
    const body: Record<string, unknown> = { ...setup.value, name: name.value, template_key: templateKey.value }
    if (relaunchOf.value) body.relaunchOf = relaunchOf.value
    if (!setup.value.end_date) delete body.end_date
    const res = await $fetch<{ campaign: { id: string } }>('/api/pt/campaigns', { method: 'POST', body })
    toast.ok(relaunchOf.value ? 'Relaunched' : 'Campaign created')
    await navigateTo(`/site/campaigns/${res.campaign.id}`)
  } catch (err) {
    toast.fail(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <h1 class="text-2xl font-semibold">
      {{ relaunchOf ? `Relaunch ${previous?.campaign?.name ?? ''}` : 'New campaign' }}
    </h1>
    <UAlert
      v-if="relaunchOf"
      icon="i-lucide-info"
      variant="soft"
      color="info"
      description="The new campaign reuses the same prayer content. Libraries you follow pick up their latest version; content you edited carries over. You can invite people from the past campaign with a site email."
    />
    <UCard>
      <div class="space-y-6">
        <UFormField
          v-if="!relaunchOf"
          label="Template"
        >
          <USelect
            v-model="templateKey"
            :items="Object.entries(PT_LABELS.template).map(([value, label]) => ({ value, label }))"
            class="w-full sm:w-80"
          />
        </UFormField>
        <UFormField
          label="Name"
          required
        >
          <UInput
            v-model="name"
            class="w-full"
          />
        </UFormField>
        <PtSetupForm
          v-model="setup"
          :template-key="templateKey"
          :lock-template="false"
        />
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            :label="relaunchOf ? 'Relaunch' : 'Create campaign'"
            :loading="saving"
            :disabled="name.trim().length < 2"
            @click="create"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
