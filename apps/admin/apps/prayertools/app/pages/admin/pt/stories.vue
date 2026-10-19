<script setup lang="ts">
// Prayer.Tools staff read every story, including those allowed for use in
// Prayer.Tools' own communications.
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] })
const onlyPlatform = ref(false)
const { data } = useFetch<{ stories: Record<string, any>[] }>('/api/pt/admin/stories', { key: 'pt-admin-stories' })
const stories = computed(() => (data.value?.stories ?? []).filter(s => !onlyPlatform.value || s.may_platform))
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        Stories
      </h1>
      <USwitch
        v-model="onlyPlatform"
        label="Only stories Prayer.Tools may use"
      />
    </div>
    <UCard
      v-for="s in stories"
      :key="s.id"
    >
      <p class="text-xs text-(--ui-text-muted) mb-2">
        {{ s.site_name }} · {{ ptFormatDate(s.created_at) }} · {{ s.use_name && s.name ? s.name : 'Anonymous' }}
        <UBadge
          v-if="s.may_platform"
          size="sm"
          color="info"
          variant="soft"
          label="Prayer.Tools may use"
        />
      </p>
      <p class="whitespace-pre-line text-sm">
        {{ s.body }}
      </p>
    </UCard>
  </div>
</template>
