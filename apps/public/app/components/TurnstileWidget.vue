<script setup lang="ts">
// Cloudflare Turnstile, rendered only when a site key is configured.
const props = defineProps<{ siteKey: string | null }>()
const token = defineModel<string>({ default: '' })
const el = ref<HTMLElement | null>(null)
let widgetId: string | null = null

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id: string) => void
}

function api(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile
}

function load(): Promise<void> {
  if (api()) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

onMounted(async () => {
  if (!props.siteKey || !el.value) return
  await load()
  widgetId = api()!.render(el.value, {
    'sitekey': props.siteKey,
    'callback': (t: string) => (token.value = t),
    'expired-callback': () => (token.value = ''),
    'language': document.documentElement.lang || 'auto'
  })
})

function reset() {
  token.value = ''
  if (widgetId) api()?.reset(widgetId)
}

defineExpose({ reset })
</script>

<template>
  <div v-if="siteKey" ref="el" />
</template>
