<script setup lang="ts">
defineProps<{ token: string, valid: boolean }>()
const { site } = useSite()
const { t } = useI18n()
useHead({ title: () => `${t('unsubscribe.title')} · ${site.value.name}` })
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-16 space-y-4">
    <h1 class="text-3xl font-bold">{{ t('unsubscribe.title') }}</h1>
    <template v-if="valid">
      <p class="text-stone-700">{{ t('unsubscribe.body', { site: site.name }) }}</p>
      <form method="post" :action="`/u/${token}`">
        <UButton type="submit" color="error" :label="t('unsubscribe.confirm')" />
      </form>
    </template>
    <p v-else class="text-stone-700">{{ t('notice.link_invalid') }}</p>
  </div>
</template>
