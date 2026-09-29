<script setup lang="ts">
import { MARKETING_STATUS, marketingDate, marketingErrorMessage } from '../../utils/marketing-ui'

definePageMeta({ middleware: 'auth' })

interface Row {
  id: string
  parent_id: string | null
  status: string
  subject: string | null
  audiences: string[]
  scheduled_at: string | null
  finished_at: string | null
  created_at: string
  recipients: number
  sent: number
  skipped: number
  failed: number
  unsubscribes: number
}

const emails = ref<Row[]>([])
const meta = ref<{ site: { name: string }, canSend: boolean } | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  try {
    const [list, m] = await Promise.all([
      $fetch<{ emails: Row[] }>('/api/marketing/emails'),
      $fetch<{ site: { name: string }, canSend: boolean }>('/api/marketing/meta')
    ])
    emails.value = list.emails
    meta.value = m
  } catch (err) {
    error.value = marketingErrorMessage(err)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function when(e: Row): string {
  if (e.status === 'sent') return `Sent ${marketingDate(e.finished_at)}`
  if (e.status === 'scheduled') return `Scheduled for ${marketingDate(e.scheduled_at)}`
  return `Created ${marketingDate(e.created_at)}`
}
</script>

<template>
  <div class="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Site email
        </h1>
        <p class="text-sm text-(--ui-text-muted)">
          Emails to people who opted in to hear from {{ meta?.site.name ?? 'this site' }}. Prayer reminders are separate and never affected.
        </p>
      </div>
      <UButton
        v-if="meta?.canSend"
        label="New email"
        icon="i-lucide-plus"
        to="/marketing/new"
      />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :description="error"
    />

    <div
      v-if="loading"
      class="space-y-2"
    >
      <USkeleton
        v-for="i in 3"
        :key="i"
        class="h-16 w-full"
      />
    </div>

    <UEmpty
      v-else-if="!emails.length"
      icon="i-lucide-mail"
      title="No emails yet"
      description="Write to everyone who opted in: news, a relaunch, a thank-you."
    />

    <ul
      v-else
      class="divide-y divide-(--ui-border) rounded-lg border border-(--ui-border)"
    >
      <li
        v-for="e in emails"
        :key="e.id"
      >
        <NuxtLink
          :to="`/marketing/${e.id}`"
          class="flex flex-wrap items-center gap-3 p-4 hover:bg-(--ui-bg-elevated)"
        >
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">
              {{ e.subject || 'Untitled email' }}
            </p>
            <p class="text-xs text-(--ui-text-muted)">
              {{ when(e) }}<span v-if="e.parent_id"> · part of a send to several sites</span>
            </p>
          </div>
          <span
            v-if="e.status !== 'draft'"
            class="text-sm tabular-nums text-(--ui-text-muted)"
          >
            {{ e.sent.toLocaleString() }} sent
          </span>
          <UBadge
            :label="MARKETING_STATUS[e.status]?.label ?? e.status"
            :color="MARKETING_STATUS[e.status]?.color ?? 'neutral'"
            variant="subtle"
          />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
