<script setup lang="ts">
// Send now, or pick a time.
const props = defineProps<{ disabled?: boolean, loading?: boolean, problems?: string[] }>()
const emit = defineEmits<{ send: [at: string | null] }>()

const later = ref(false)
const at = ref('')
const confirmOpen = ref(false)

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
        :disabled="props.disabled || !!props.problems?.length || (later && !at)"
        @click="confirmOpen = true"
      />
    </div>
    <UModal
      v-model:open="confirmOpen"
      :title="later ? 'Schedule this email?' : 'Send this email now?'"
      description="Only people who opted in get it. Nobody gets it twice."
    >
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
