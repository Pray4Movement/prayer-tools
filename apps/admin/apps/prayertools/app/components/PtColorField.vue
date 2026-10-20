<script setup lang="ts">
// Brand color: a picker, suggested colors, a hex field and a preview of
// readable text on the chosen color.
import { brandColor, DEFAULT_BRAND_COLOR, parseHex } from '@prayertools/shared/colors'

const PRESETS = [DEFAULT_BRAND_COLOR, '#1d4ed8', '#0f766e', '#15803d', '#b45309', '#b91c1c', '#7e22ce', '#be185d', '#334155']

const color = defineModel<string>({ required: true })
defineProps<{ label?: string }>()

const hex = ref(color.value)
watch(color, (v) => {
  if (v !== hex.value) hex.value = v
})
watch(hex, (v) => {
  const s = v.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(s)) color.value = s
})
const info = computed(() => brandColor(parseHex(color.value) ? color.value : DEFAULT_BRAND_COLOR))
</script>

<template>
  <UFormField
    :label="label ?? 'Brand color'"
    description="Used for buttons, headers and emails."
  >
    <div class="flex flex-col sm:flex-row gap-4">
      <UColorPicker
        :model-value="info.color"
        @update:model-value="(v: string | undefined) => { if (v) color = v }"
      />
      <div class="space-y-3 flex-1 min-w-0">
        <div
          class="flex flex-wrap gap-2"
          role="group"
          aria-label="Suggested colors"
        >
          <button
            v-for="p in PRESETS"
            :key="p"
            type="button"
            class="size-8 rounded-full ring-offset-2 ring-offset-(--ui-bg) focus-visible:outline-2"
            :class="color === p ? 'ring-2 ring-(--ui-text)' : ''"
            :style="{ background: p }"
            :aria-label="`Use ${p}`"
            @click="color = p"
          />
        </div>
        <UInput
          v-model="hex"
          :placeholder="DEFAULT_BRAND_COLOR"
          class="w-36"
          aria-label="Hex color"
        />
        <div
          class="rounded-lg p-4 flex items-center justify-between gap-3"
          :style="{ background: info.color, color: info.textColor }"
        >
          <span class="font-semibold">Pray with us</span>
          <span
            class="text-xs rounded-md px-3 py-1.5 border"
            :style="{ borderColor: info.textColor }"
          >Sign up</span>
        </div>
        <p class="text-xs text-(--ui-text-muted)">
          Text on this color will be {{ info.textColor === '#ffffff' ? 'white' : 'dark' }} so it stays readable.
        </p>
        <UAlert
          v-if="info.tooPale"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="This color is very pale"
          description="Links and buttons in this color will be hard to see on a white page. Choose a deeper shade."
        />
      </div>
    </div>
  </UFormField>
</template>
