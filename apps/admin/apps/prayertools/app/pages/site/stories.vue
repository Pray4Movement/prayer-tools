<script setup lang="ts">
// Stories people submitted. Each also arrived in the inbox as a thread; here
// the team chooses which (allowed) stories appear on the landing page.
definePageMeta({ middleware: 'auth' })

interface Story { id: string, name: string | null, body: string, language: string, may_publish: boolean, may_platform: boolean, use_name: boolean, published: boolean, created_at: string, conversation_id: string | null }

const { data: site, can } = usePtSite()
const toast = usePtToast()
const { data, refresh } = useFetch<{ stories: Story[] }>('/api/pt/stories', { key: 'pt-stories' })

async function setPublished(s: Story, published: boolean) {
  try {
    await $fetch(`/api/pt/stories/${s.id}`, { method: 'PATCH', body: { published } })
    await refresh()
  } catch (err) {
    toast.fail(err)
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">
        Stories
      </h1>
      <p class="text-sm text-(--ui-text-muted)">
        Every story also arrives in your inbox, where you can reply. Add a story to the landing page only if its writer allowed it.
      </p>
    </div>
    <p
      v-if="!data?.stories.length"
      class="text-sm text-(--ui-text-muted)"
    >
      No stories yet.
    </p>
    <UCard
      v-for="s in data?.stories ?? []"
      :key="s.id"
    >
      <div class="space-y-3">
        <p class="whitespace-pre-line text-sm">
          {{ s.body }}
        </p>
        <div class="flex flex-wrap items-center gap-2 text-xs text-(--ui-text-muted)">
          <span>{{ ptFormatDate(s.created_at) }}</span>
          <span>· {{ s.use_name && s.name ? s.name : 'Anonymous' }}</span>
          <UBadge
            size="sm"
            variant="soft"
            :color="s.may_publish ? 'success' : 'neutral'"
            :label="s.may_publish ? 'May be published by this site' : 'Not for publishing'"
          />
          <UBadge
            v-if="s.may_platform"
            size="sm"
            variant="soft"
            color="info"
            label="Prayer.Tools may use it"
          />
        </div>
        <div class="flex gap-2">
          <UButton
            v-if="s.may_publish && can('pt.site.write')"
            size="sm"
            :variant="s.published ? 'soft' : 'solid'"
            :label="s.published ? 'Remove from landing page' : 'Add to landing page'"
            @click="setPublished(s, !s.published)"
          />
          <UButton
            v-if="s.conversation_id && can('inbox.access')"
            size="sm"
            variant="ghost"
            color="neutral"
            :to="`/@${site?.org.slug}/inbox/${s.conversation_id}`"
            label="Open in inbox"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
