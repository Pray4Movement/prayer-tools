<script setup lang="ts">
// One landing page section in the editor: heading, what it shows, a show
// switch (or "Always shown"), and its fields. Clicking or focusing it selects
// the section, which the preview mirrors.
const props = defineProps<{
  section: string
  title: string
  description?: string
  icon: string
  selected: boolean
  // null for sections that always show.
  shown: boolean | null
  canToggle: boolean
}>()
const emit = defineEmits<{ 'select': [], 'update:shown': [value: boolean] }>()
</script>

<template>
  <UCard
    :id="`pt-ed-${section}`"
    class="scroll-mt-20 transition-[box-shadow,background-color]"
    :class="selected ? PT_LANDING_SELECTED : ''"
    @click="emit('select')"
    @focusin="emit('select')"
  >
    <template #header>
      <div class="flex items-start gap-3">
        <UIcon
          :name="icon"
          class="size-5 shrink-0 mt-0.5"
          :class="shown === false ? 'text-(--ui-text-dimmed)' : 'text-(--ui-primary)'"
        />
        <div class="min-w-0 flex-1">
          <p
            class="font-medium"
            :class="{ 'text-(--ui-text-muted)': shown === false }"
          >
            {{ title }}
          </p>
          <p
            v-if="description || $slots.description"
            class="text-sm text-(--ui-text-muted)"
          >
            <slot name="description">
              {{ description }}
            </slot>
          </p>
        </div>
        <slot name="actions" />
        <UBadge
          v-if="props.shown === null"
          variant="subtle"
          color="neutral"
          label="Always shown"
        />
        <USwitch
          v-else
          :model-value="props.shown"
          :disabled="!canToggle"
          label="Show"
          @update:model-value="v => emit('update:shown', v)"
        />
      </div>
    </template>
    <div
      v-if="$slots.default"
      class="space-y-4"
      :class="{ 'opacity-60': shown === false }"
    >
      <slot />
    </div>
  </UCard>
</template>
