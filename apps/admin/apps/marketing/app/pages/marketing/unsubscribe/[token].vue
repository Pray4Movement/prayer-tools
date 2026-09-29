<script setup lang="ts">
// Public: reached from the unsubscribe link in a site email. No login.
definePageMeta({ layout: false, tenantExempt: true })

const route = useRoute()
const token = String(route.params.token ?? '')
const info = ref<{ test: boolean, address: string, sites: { id: string, name: string }[] } | null>(null)
const state = ref<'loading' | 'ready' | 'invalid' | 'done' | 'error'>('loading')

onMounted(async () => {
  try {
    info.value = await $fetch('/api/marketing/unsubscribe/info', { query: { token } })
    state.value = 'ready'
  } catch {
    state.value = 'invalid'
  }
})

async function confirm() {
  try {
    await $fetch('/api/marketing/unsubscribe', { method: 'POST', body: { token } })
    state.value = 'done'
  } catch {
    state.value = 'error'
  }
}

const siteNames = computed(() => {
  const names = info.value?.sites.map(s => s.name) ?? []
  return names.length <= 1 ? (names[0] ?? 'this site') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-(--ui-bg-muted) p-4">
    <UCard class="w-full max-w-md">
      <div
        v-if="state === 'loading'"
        class="flex justify-center py-6"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin"
        />
      </div>
      <div
        v-else-if="state === 'invalid'"
        class="space-y-2"
      >
        <h1 class="text-lg font-semibold">
          This link doesn't work
        </h1>
        <p class="text-sm text-(--ui-text-muted)">
          It may have been cut off by your email program. Try the unsubscribe link in the email again.
        </p>
      </div>
      <div
        v-else-if="info?.test"
        class="space-y-2"
      >
        <h1 class="text-lg font-semibold">
          This was a test email
        </h1>
        <p class="text-sm text-(--ui-text-muted)">
          Links in test emails don't change anyone's settings.
        </p>
      </div>
      <div
        v-else-if="state === 'ready'"
        class="space-y-4"
      >
        <h1 class="text-lg font-semibold">
          Stop emails from {{ siteNames }}?
        </h1>
        <p class="text-sm text-(--ui-text-muted)">
          {{ info?.address }} will no longer get news and updates from {{ siteNames }}. Your prayer reminders don't change.
        </p>
        <UButton
          label="Unsubscribe"
          block
          @click="confirm"
        />
      </div>
      <div
        v-else-if="state === 'done'"
        class="space-y-2"
      >
        <h1 class="text-lg font-semibold">
          You're unsubscribed
        </h1>
        <p class="text-sm text-(--ui-text-muted)">
          You won't get news and updates from {{ siteNames }} any more. Your prayer reminders continue as before.
        </p>
      </div>
      <UAlert
        v-else
        color="error"
        variant="soft"
        description="Something went wrong. Please try again in a moment."
      />
    </UCard>
  </div>
</template>
