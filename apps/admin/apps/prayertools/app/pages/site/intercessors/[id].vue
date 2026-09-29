<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: site, can } = usePtSite()
const { data: meta } = usePtMeta()
const toast = usePtToast()
const { data, refresh } = useFetch<Record<string, any>>(() => `/api/pt/intercessors/${id.value}`, { key: computed(() => `pt-intercessor-${id.value}`) })
const { data: campaigns } = useFetch<{ campaigns: { id: string, name: string, goal: string, track_time: boolean }[] }>('/api/pt/campaigns', { key: 'pt-campaigns' })

async function patch(body: Record<string, unknown>, message = 'Saved') {
  try {
    await $fetch(`/api/pt/intercessors/${id.value}`, { method: 'PATCH', body })
    await refresh()
    toast.ok(message)
  } catch (err) {
    toast.fail(err)
  }
}

function describe(c: Record<string, any>): string {
  const when = c.kind === 'dates'
    ? `${c.dates.length} date${c.dates.length === 1 ? '' : 's'}`
    : c.frequency === 'daily' ? 'Every day' : `Every ${c.days_of_week.map((d: number) => PT_LABELS.weekday[d]).join(', ')}`
  return `${when} at ${c.time} (${c.timezone})${c.duration_min ? ` · ${c.duration_min} min` : ''}`
}

const add = reactive({ open: false, campaignId: '', frequency: 'daily', days: [] as number[], time: '07:00', duration: 15 })
async function addCommitment() {
  try {
    await $fetch(`/api/pt/intercessors/${id.value}/commitments`, {
      method: 'POST',
      body: { campaignId: add.campaignId, frequency: add.frequency, days_of_week: add.days, time: add.time, duration_min: add.duration }
    })
    add.open = false
    await refresh()
  } catch (err) {
    toast.fail(err)
  }
}
async function togglePause(c: Record<string, any>) {
  await $fetch(`/api/pt/intercessors/${id.value}/commitments/${c.id}`, { method: 'PATCH', body: { paused: !c.paused } }).catch(err => toast.fail(err))
  await refresh()
}
async function removeCommitment(c: Record<string, any>) {
  await $fetch(`/api/pt/intercessors/${id.value}/commitments/${c.id}`, { method: 'DELETE' }).catch(err => toast.fail(err))
  await refresh()
}
async function sendCheckin() {
  try {
    await $fetch(`/api/pt/intercessors/${id.value}/checkin`, { method: 'POST' })
    toast.ok('Check-in email queued')
  } catch (err) {
    toast.fail(err)
  }
}
const confirmDelete = ref(false)
async function remove() {
  await $fetch(`/api/pt/intercessors/${id.value}`, { method: 'DELETE' })
  await navigateTo('/site/intercessors')
}
const PURPOSE_LABELS: Record<string, string> = { site_updates: 'Updates from this site' }
</script>

<template>
  <div
    v-if="data && site"
    class="max-w-4xl mx-auto space-y-6"
  >
    <div>
      <UButton
        to="/site/intercessors"
        icon="i-lucide-arrow-left"
        variant="link"
        color="neutral"
        label="Intercessors"
        class="px-0"
      />
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-semibold">
          {{ data.contact.name }}
        </h1>
        <UBadge
          :label="PT_LABELS.subscriptionStatus[data.subscription.status]"
          :color="ptStatusColor(data.subscription.status)"
          variant="subtle"
        />
      </div>
      <p class="text-sm text-(--ui-text-muted)">
        {{ data.email }}
        <UBadge
          v-if="!data.subscription.verified_at"
          size="sm"
          color="warning"
          variant="soft"
          label="Email not confirmed"
        />
        · signed up {{ ptFormatDate(data.subscription.created_at) }}
        <span v-if="data.subscription.last_activity_at"> · last prayed {{ ptFormatDate(data.subscription.last_activity_at) }}</span>
      </p>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Subscription
          </h2>
        </template>
        <div class="space-y-3">
          <UFormField label="Status">
            <USelect
              :model-value="data.subscription.status"
              :items="Object.entries(PT_LABELS.subscriptionStatus).map(([value, label]) => ({ value, label }))"
              :disabled="!can('pt.intercessors.write')"
              class="w-48"
              @update:model-value="(v) => patch({ status: v })"
            />
          </UFormField>
          <UFormField label="Language">
            <USelect
              :model-value="data.subscription.language"
              :items="site.site.languages.map(l => ({ value: l, label: languageName(meta, l) }))"
              :disabled="!can('pt.intercessors.write')"
              class="w-48"
              @update:model-value="(v) => patch({ language: v })"
            />
          </UFormField>
          <UFormField label="Timezone">
            <USelectMenu
              :model-value="data.subscription.timezone"
              :items="ptTimezones()"
              :disabled="!can('pt.intercessors.write')"
              class="w-64"
              @update:model-value="(v) => patch({ timezone: v })"
            />
          </UFormField>
          <p
            v-if="data.subscription.referred_by"
            class="text-xs text-(--ui-text-muted)"
          >
            Joined through a share link.
          </p>
        </div>
      </UCard>
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Consent
          </h2>
        </template>
        <ul class="text-sm space-y-1">
          <li
            v-for="(on, purpose) in data.consent"
            :key="purpose"
            class="flex items-center gap-2"
          >
            <UIcon
              :name="on ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
              :class="on ? 'text-(--ui-success)' : 'text-(--ui-text-dimmed)'"
            />
            {{ PURPOSE_LABELS[purpose] ?? String(purpose).replace('custom:', '') }}
          </li>
          <li
            v-if="!Object.keys(data.consent).length"
            class="text-(--ui-text-muted)"
          >
            No consent given for updates.
          </li>
        </ul>
        <details
          v-if="data.consentHistory.length"
          class="mt-3 text-xs"
        >
          <summary class="cursor-pointer text-(--ui-text-muted)">
            Consent history
          </summary>
          <ul class="mt-2 space-y-1">
            <li
              v-for="(e, i) in data.consentHistory"
              :key="i"
            >
              {{ ptFormatDate(e.occurred_at, { dateStyle: 'medium', timeStyle: 'short' }) }} — {{ e.event === 'grant' ? 'Agreed to' : 'Withdrew' }} {{ PURPOSE_LABELS[e.purpose] ?? e.purpose }} ({{ e.source }}<span v-if="e.meta?.surface">, {{ e.meta.surface }}</span>)
            </li>
          </ul>
        </details>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">
            Prayer times
          </h2>
          <UButton
            v-if="can('pt.intercessors.write')"
            size="sm"
            icon="i-lucide-plus"
            label="Add"
            @click="add.open = true; add.campaignId = campaigns?.campaigns[0]?.id ?? ''"
          />
        </div>
      </template>
      <ul class="divide-y divide-(--ui-border)">
        <li
          v-for="c in data.commitments"
          :key="c.id"
          class="py-2 flex flex-wrap items-center justify-between gap-2 text-sm"
        >
          <div>
            <p class="font-medium">
              {{ c.campaign_name }}
            </p>
            <p class="text-(--ui-text-muted)">
              {{ describe(c) }}<span v-if="c.paused"> · paused</span>
            </p>
            <p
              v-if="c.next_reminder_utc"
              class="text-xs text-(--ui-text-muted)"
            >
              Next reminder {{ ptFormatDate(c.next_reminder_utc, { dateStyle: 'medium', timeStyle: 'short' }) }}
            </p>
          </div>
          <div
            v-if="can('pt.intercessors.write')"
            class="flex gap-1"
          >
            <UButton
              size="xs"
              variant="ghost"
              :label="c.paused ? 'Resume' : 'Pause'"
              @click="togglePause(c)"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              label="Remove"
              @click="removeCommitment(c)"
            />
          </div>
        </li>
        <li
          v-if="!data.commitments.length"
          class="py-2 text-sm text-(--ui-text-muted)"
        >
          No prayer times.
        </li>
      </ul>
    </UCard>

    <div class="grid md:grid-cols-2 gap-4">
      <UCard v-if="data.answers.length">
        <template #header>
          <h2 class="font-semibold">
            Signup answers
          </h2>
        </template>
        <dl class="text-sm space-y-2">
          <div
            v-for="a in data.answers"
            :key="a.key"
          >
            <dt class="text-(--ui-text-muted)">
              {{ a.label.values[site.site.default_language] ?? a.key }}
            </dt>
            <dd>{{ a.value === true ? 'Yes' : a.value === false ? 'No' : (a.options?.find((o: any) => o.key === a.value)?.label.values[site.site.default_language] ?? a.value ?? '—') }}</dd>
          </div>
        </dl>
      </UCard>
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Prayer and check-ins
          </h2>
        </template>
        <ul class="text-sm space-y-1">
          <li
            v-for="t in data.totals"
            :key="t.campaign_name"
          >
            {{ t.campaign_name }}: {{ t.prayers }} prayers, {{ Math.round(t.seconds / 60) }} minutes
          </li>
          <li
            v-for="(c, i) in data.checkins"
            :key="`c${i}`"
            class="text-(--ui-text-muted)"
          >
            {{ c.kind === 'reminder' ? 'Check-in reminder' : 'Check-in' }} sent {{ ptFormatDate(c.sent_at) }}<span v-if="c.response"> — answered “{{ c.response }}”</span>
          </li>
          <li
            v-if="!data.totals.length && !data.checkins.length"
            class="text-(--ui-text-muted)"
          >
            Nothing yet.
          </li>
        </ul>
        <UButton
          v-if="can('pt.intercessors.write') && data.subscription.verified_at && data.subscription.status !== 'unsubscribed'"
          class="mt-3"
          size="sm"
          variant="soft"
          label="Send a check-in now"
          @click="sendCheckin"
        />
      </UCard>
    </div>

    <div
      v-if="can('pt.intercessors.write')"
      class="flex justify-end"
    >
      <UButton
        color="error"
        variant="ghost"
        icon="i-lucide-trash"
        label="Delete this person's data"
        @click="confirmDelete = true"
      />
    </div>

    <UModal
      v-model:open="add.open"
      title="Add a prayer time"
    >
      <template #body>
        <div class="space-y-3">
          <UFormField label="Campaign">
            <USelect
              v-model="add.campaignId"
              :items="(campaigns?.campaigns ?? []).map(c => ({ value: c.id, label: c.name }))"
              class="w-full"
            />
          </UFormField>
          <UFormField label="How often">
            <URadioGroup
              v-model="add.frequency"
              :items="[{ value: 'daily', label: 'Every day' }, { value: 'weekly', label: 'Selected days' }]"
              orientation="horizontal"
            />
          </UFormField>
          <UFormField
            v-if="add.frequency === 'weekly'"
            label="Days"
          >
            <UCheckboxGroup
              v-model="add.days"
              :items="PT_LABELS.weekday.map((label, value) => ({ label, value }))"
              orientation="horizontal"
            />
          </UFormField>
          <div class="flex gap-3">
            <UFormField label="Time (their timezone)">
              <UInput
                v-model="add.time"
                type="time"
              />
            </UFormField>
            <UFormField label="Minutes">
              <UInputNumber
                v-model="add.duration"
                :min="1"
                :max="1440"
              />
            </UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end w-full">
          <UButton
            label="Add"
            @click="addCommitment"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="confirmDelete"
      title="Delete this person's data?"
      description="Their subscription, prayer times and contact record on this site are deleted. This can't be undone."
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="confirmDelete = false"
          />
          <UButton
            label="Delete"
            color="error"
            @click="remove"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
