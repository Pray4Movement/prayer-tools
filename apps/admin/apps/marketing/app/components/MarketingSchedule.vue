<script setup lang="ts">
// Send now, or pick a time. The confirm names every site the email goes out
// on and how many people it reaches there.
const props = defineProps<{
  disabled?: boolean
  loading?: boolean
  problems?: string[]
  targets: { name: string, count: number }[]
  // People reached across all targets, each counted once (multi-site sends).
  people?: number
}>()
const emit = defineEmits<{ send: [at: string | null] }>()

const later = ref(false)
const at = ref('')
const confirmOpen = ref(false)

function peopleLabel(n: number): string {
  return `${n.toLocaleString()} ${n === 1 ? 'person' : 'people'}`
}

const total = computed(() => props.people ?? props.targets.reduce((n, t) => n + t.count, 0))
const where = computed(() => props.targets.length === 1 ? props.targets[0]!.name : `${props.targets.length} sites`)
const title = computed(() => `${later.value ? 'Schedule for' : 'Send to'} ${peopleLabel(total.value)} on ${where.value}?`)

function go() {
  confirmOpen.value = false
  emit('send', later.value && at.value ? new Date(at.value).toISOString() : null)
}
</script>

<template>
  <div class="space-y-3">
    <UAlert
      v-if="props.problems?.length"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="props.problems.join(' ')"
    />
    <p
      v-else-if="total === 0"
      class="text-sm text-(--ui-text-muted)"
    >
      Nobody in the chosen audience has opted in, so there's no one to send to.
    </p>
    <div class="flex flex-wrap items-center gap-3">
      <USwitch
        v-model="later"
        label="Schedule for later"
        :disabled="props.disabled"
      />
      <UInput
        v-if="later"
        v-model="at"
        type="datetime-local"
        :disabled="props.disabled"
      />
      <div class="flex-1" />
      <UButton
        :label="later ? 'Schedule' : 'Send now'"
        :icon="later ? 'i-lucide-calendar-clock' : 'i-lucide-send'"
        :loading="props.loading"
        :disabled="props.disabled || !!props.problems?.length || (later && !at) || total === 0"
        @click="confirmOpen = true"
      />
    </div>
    <UModal
      v-model:open="confirmOpen"
      :title="title"
      description="Only people who opted in get it. Nobody gets it twice."
    >
      <template
        v-if="props.targets.length > 1"
        #body
      >
        <ul class="text-sm space-y-1">
          <li
            v-for="t in props.targets"
            :key="t.name"
            class="flex justify-between gap-4"
          >
            <span>{{ t.name }}</span>
            <span class="text-(--ui-text-muted)">{{ peopleLabel(t.count) }}</span>
          </li>
        </ul>
        <p class="text-xs text-(--ui-text-muted) mt-3">
          Someone on several of these sites gets one email.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="Not yet"
            color="neutral"
            variant="ghost"
            @click="confirmOpen = false"
          />
          <UButton
            :label="later ? 'Schedule' : 'Send now'"
            @click="go"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
