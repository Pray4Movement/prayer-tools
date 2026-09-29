<script setup lang="ts">
const props = defineProps<{ token: string }>()
const { site } = useSite()
const { t } = useI18n()
useHead({ title: () => `${t('expired.title')} · ${site.value.name}` })
const sent = ref(false)
const sending = ref(false)

async function send() {
  sending.value = true
  try {
    await $fetch('/api/manage/fresh-link', { method: 'POST', body: { token: props.token } })
  } catch {
    // the answer is the same either way
  }
  sent.value = true
  sending.value = false
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-16 space-y-4">
    <h1 class="text-3xl font-bold">{{ t('expired.title') }}</h1>
    <p class="text-stone-700">{{ t('expired.body') }}</p>
    <UAlert v-if="sent" color="success" variant="soft" icon="i-lucide-mail" :title="t('expired.sent')" role="status" />
    <UButton v-else-if="token" :loading="sending" icon="i-lucide-send" :label="t('expired.send')" @click="send" />
    <p class="text-sm"><a :href="site.myUrl" class="underline">{{ t('footer.my') }}</a></p>
  </div>
</template>
