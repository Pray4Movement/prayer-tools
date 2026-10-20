<script setup lang="ts">
// Per-day 24/7 coverage as a month calendar; shade deepens with coverage.
const props = defineProps<{
  days: { date: string, percent: number }[]
  today?: string
}>()

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const months = computed(() => {
  const byMonth = new Map<string, typeof props.days>()
  for (const d of props.days) {
    const key = d.date.slice(0, 7)
    byMonth.set(key, [...(byMonth.get(key) ?? []), d])
  }
  return [...byMonth.entries()].map(([key, list]) => {
    const first = new Date(`${key}-01T00:00:00Z`)
    const lead = (first.getUTCDay() + 6) % 7
    const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
    const byDate = new Map(list.map(d => [d.date, d]))
    const cells: ({ date: string, n: number, info: typeof list[number] | undefined } | null)[] = Array.from({ length: lead }, () => null)
    for (let n = 1; n <= daysInMonth; n++) {
      const date = `${key}-${String(n).padStart(2, '0')}`
      cells.push({ date, n, info: byDate.get(date) })
    }
    return { key, label: ptFormatDate(`${key}-01`, { month: 'long', year: 'numeric' }), cells }
  })
})

// Four shade steps of the primary color; 0% stays the plain surface.
function shade(pct: number): string {
  if (pct <= 0) return 'bg-(--ui-bg-elevated)'
  if (pct < 25) return 'bg-(--ui-primary)/20'
  if (pct < 50) return 'bg-(--ui-primary)/40'
  if (pct < 100) return 'bg-(--ui-primary)/70 text-(--ui-text-inverted)'
  return 'bg-(--ui-primary) text-(--ui-text-inverted)'
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3 text-xs text-(--ui-text-muted)">
      <span>Coverage per day:</span>
      <span class="flex items-center gap-1"><span class="size-3 rounded-sm bg-(--ui-bg-elevated) border border-(--ui-border)" /> none</span>
      <span class="flex items-center gap-1"><span class="size-3 rounded-sm bg-(--ui-primary)/20" /> under 25%</span>
      <span class="flex items-center gap-1"><span class="size-3 rounded-sm bg-(--ui-primary)/40" /> under 50%</span>
      <span class="flex items-center gap-1"><span class="size-3 rounded-sm bg-(--ui-primary)/70" /> under 100%</span>
      <span class="flex items-center gap-1"><span class="size-3 rounded-sm bg-(--ui-primary)" /> 24/7</span>
    </div>
    <div class="grid gap-6 sm:grid-cols-2">
      <div
        v-for="m in months"
        :key="m.key"
      >
        <div class="font-medium text-sm mb-2">
          {{ m.label }}
        </div>
        <div
          class="grid grid-cols-7 gap-0.5 text-center text-xs"
          role="grid"
          :aria-label="m.label"
        >
          <div
            v-for="w in WEEKDAYS"
            :key="w"
            class="text-(--ui-text-muted) pb-1"
          >
            {{ w }}
          </div>
          <template
            v-for="(c, i) in m.cells"
            :key="c?.date ?? `lead-${i}`"
          >
            <div v-if="!c" />
            <div
              v-else
              class="aspect-square rounded-sm flex flex-col items-center justify-center leading-tight"
              :class="[c.info ? shade(c.info.percent) : 'text-(--ui-text-dimmed)', c.date === props.today ? 'ring-2 ring-(--ui-text)' : '']"
              :title="c.info ? `${ptFormatDate(c.date, { dateStyle: 'full' })}: ${Math.round(c.info.percent)}% covered` : undefined"
            >
              <span>{{ c.n }}</span>
              <span
                v-if="c.info"
                class="text-[10px] opacity-80 tabular-nums"
              >{{ Math.round(c.info.percent) }}%</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
