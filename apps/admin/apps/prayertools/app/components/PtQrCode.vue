<script setup lang="ts">
// A QR code for a link, drawn in the browser.
const props = withDefaults(defineProps<{ value: string, size?: number }>(), { size: 200 })

const dataUrl = ref<string | null>(null)
const failed = ref(false)

watchEffect(async () => {
  if (!import.meta.client || !props.value) return
  try {
    const QRCode = (await import('qrcode')).default
    dataUrl.value = await QRCode.toDataURL(props.value, { width: props.size * 2, margin: 1 })
    failed.value = false
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <div
    class="shrink-0 bg-white p-2 rounded-md border border-(--ui-border)"
    :style="{ width: `${size + 16}px`, height: `${size + 16}px` }"
  >
    <img
      v-if="dataUrl"
      :src="dataUrl"
      :width="size"
      :height="size"
      :alt="`QR code for ${value}`"
    >
    <p
      v-else-if="failed"
      class="text-xs text-(--ui-error)"
    >
      Could not draw the QR code
    </p>
    <USkeleton
      v-else
      class="w-full h-full"
    />
  </div>
</template>
