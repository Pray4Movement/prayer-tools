<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
defineProps<{ title?: string, description?: string }>()
const { st } = useSite()
const { t } = useI18n()
</script>

<template>
  <UModal v-model:open="open" :title="title ?? t('share.prompt_title')" :description="description ?? st('landing.share.title')">
    <template #body>
      <ShareButton />
    </template>
  </UModal>
</template>
