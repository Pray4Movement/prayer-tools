<script setup lang="ts">
const props = defineProps<{
  stats: { recipients: number, sent: number, skipped: number, failed: number, unsubscribes: number, people?: number, pending?: number }
}>()

const tiles = computed(() => [
  ...(props.stats.people !== undefined ? [{ label: 'People', value: props.stats.people, hint: 'Each gets one email' }] : []),
  { label: 'Sent', value: props.stats.sent },
  ...(props.stats.pending ? [{ label: 'Waiting', value: props.stats.pending }] : []),
  { label: 'Skipped', value: props.stats.skipped },
  { label: 'Failed', value: props.stats.failed },
  { label: 'Unsubscribed', value: props.stats.unsubscribes }
])
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    <div
      v-for="t in tiles"
      :key="t.label"
      class="rounded-lg border border-(--ui-border) p-3"
    >
      <p class="text-xs text-(--ui-text-muted)">
        {{ t.label }}
      </p>
      <p class="text-2xl font-semibold tabular-nums">
        {{ t.value.toLocaleString() }}
      </p>
      <p
        v-if="'hint' in t && t.hint"
        class="text-xs text-(--ui-text-dimmed)"
      >
        {{ t.hint }}
      </p>
    </div>
  </div>
</template>
