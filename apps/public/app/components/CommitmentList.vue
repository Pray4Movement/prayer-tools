<script setup lang="ts">
// A person's prayer times with edit / pause / remove, and adding a new one.
// The parent performs the API calls.
import type { CommitmentView } from '~~/shared/view'
import { describeRule, formatMinutes, newCommitment, type CommitmentInput } from '~/utils/commitment'

const props = defineProps<{
  commitments: CommitmentView[]
  durationRule: 'required' | 'optional' | 'hidden'
  durations: number[]
  defaultDuration: number
  canAdd: boolean
  lang: string
  icsBase?: string
  busy?: boolean
}>()
const emit = defineEmits<{
  add: [input: CommitmentInput]
  update: [id: string, input: CommitmentInput]
  pause: [id: string, paused: boolean]
  remove: [id: string]
}>()
const { t } = useI18n()

const editing = ref<string | null>(null)
const draft = ref<CommitmentInput>(newCommitment(props.durationRule, props.defaultDuration))
const adding = ref(false)

function startEdit(c: CommitmentView) {
  editing.value = c.id
  adding.value = false
  draft.value = { frequency: c.frequency ?? 'daily', days_of_week: [...c.daysOfWeek], time: c.time, duration_min: c.durationMin }
}

function startAdd() {
  editing.value = null
  adding.value = true
  draft.value = newCommitment(props.durationRule, props.defaultDuration)
}

function save() {
  if (adding.value) emit('add', { ...draft.value })
  else if (editing.value) emit('update', editing.value, { ...draft.value })
  editing.value = null
  adding.value = false
}

function dateList(c: CommitmentView): string {
  const fmt = new Intl.DateTimeFormat(props.lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: c.timezone })
  return c.dates.map(d => fmt.format(new Date(d))).join(', ')
}
</script>

<template>
  <div class="space-y-3">
    <p v-if="!commitments.length" class="text-stone-600">{{ t('manage.no_times') }}</p>
    <ul class="space-y-3">
      <li v-for="c in commitments" :key="c.id" class="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
        <div class="flex flex-wrap items-start gap-2">
          <div class="me-auto">
            <p class="font-medium">{{ describeRule(c, lang, t) }}</p>
            <p class="text-sm text-stone-600">
              {{ c.timezone }}<template v-if="c.durationMin"> · {{ formatMinutes(c.durationMin, lang) }}</template>
            </p>
            <p v-if="c.kind === 'dates'" class="text-sm text-stone-600">{{ dateList(c) }}</p>
          </div>
          <UBadge v-if="c.paused" color="warning" variant="soft" :label="t('manage.paused')" />
        </div>
        <div v-if="editing === c.id" class="space-y-3">
          <CommitmentFields v-model="draft" :duration-rule="durationRule" :durations="durations" :id-prefix="`e-${c.id}`" :lang="lang" />
          <div class="flex gap-2">
            <UButton :loading="busy" :label="t('common.save')" @click="save" />
            <UButton variant="ghost" color="neutral" :label="t('common.cancel')" @click="editing = null" />
          </div>
        </div>
        <div v-else-if="!c.campaignEnded" class="flex flex-wrap gap-2">
          <UButton v-if="c.kind === 'recurring'" size="sm" variant="outline" icon="i-lucide-pencil" :label="t('manage.change')" @click="startEdit(c)" />
          <UButton size="sm" variant="outline" :icon="c.paused ? 'i-lucide-play' : 'i-lucide-pause'" :label="c.paused ? t('manage.resume') : t('manage.pause')" @click="emit('pause', c.id, !c.paused)" />
          <UButton size="sm" variant="outline" color="error" icon="i-lucide-trash-2" :label="t('manage.remove')" @click="emit('remove', c.id)" />
          <UButton v-if="icsBase" size="sm" variant="ghost" color="neutral" icon="i-lucide-calendar-plus" :label="t('manage.add_to_calendar')" :href="`${icsBase}/${c.id}.ics`" external />
        </div>
      </li>
    </ul>
    <div v-if="adding" class="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
      <CommitmentFields v-model="draft" :duration-rule="durationRule" :durations="durations" id-prefix="new" :lang="lang" />
      <div class="flex gap-2">
        <UButton :loading="busy" :label="t('manage.add_time')" @click="save" />
        <UButton variant="ghost" color="neutral" :label="t('common.cancel')" @click="adding = false" />
      </div>
    </div>
    <UButton v-else-if="canAdd" variant="outline" icon="i-lucide-plus" :label="t('manage.add_time')" @click="startAdd" />
  </div>
</template>
