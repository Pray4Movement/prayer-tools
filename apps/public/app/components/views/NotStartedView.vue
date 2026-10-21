<script setup lang="ts">
// The pray page before a dated campaign's first day: no prayer content yet.
import type { PageView } from '~~/shared/view'

defineProps<{ page: Extract<PageView, { kind: 'not_started' }> }>()
const { site, link, st, date } = useSite()
const { t } = useI18n()
const route = useRoute()

useHead({ title: () => site.value.name })

const joined = computed(() => route.query.joined === '1')
const needsVerify = computed(() => route.query.verify === '1')
const confirmed = computed(() => route.query.confirmed === '1')
const sharePrompt = ref(false)
const verifyPrompt = ref(false)
const signupEmail = useState<string | null>('pt-signup-email', () => null)

onMounted(() => {
  if (joined.value && needsVerify.value) verifyPrompt.value = true
  else if ((joined.value || confirmed.value) && site.value.settings.sharePrompts) setTimeout(() => (sharePrompt.value = true), 1200)
  dropQueryParams('confirmed', 'joined', 'verify')
})
</script>

<template>
  <article class="max-w-3xl mx-auto px-4 py-8 space-y-6">
    <UAlert v-if="joined && needsVerify" color="warning" variant="soft" icon="i-lucide-mail" :title="t('pray.check_email_title')" :description="t('pray.check_email_body_not_started')" role="status" />
    <UAlert v-else-if="joined" color="success" variant="soft" icon="i-lucide-check" :title="st('signup.success')" role="status" />
    <UAlert v-if="confirmed" color="success" variant="soft" icon="i-lucide-badge-check" :title="t('pray.confirmed_title')" :description="t('pray.confirmed_body')" role="status" />

    <header class="space-y-2">
      <p v-if="site.campaign" class="text-sm text-stone-600">{{ site.campaign.name }}</p>
      <h1 class="text-3xl font-bold">{{ t('pray.not_started_title', { date: date(page.startDate) }) }}</h1>
      <p class="text-stone-700">{{ t('pray.not_started_body') }}</p>
    </header>

    <section class="space-y-3 border-t border-stone-200 pt-6" aria-labelledby="pray-share">
      <h2 id="pray-share" class="text-lg font-semibold">{{ t('share.invite') }}</h2>
      <ShareButton size="md" variant="soft" />
      <p v-if="!joined" class="text-sm"><NuxtLink :to="link('signup')" class="underline">{{ t('pray.get_reminders') }}</NuxtLink></p>
    </section>

    <UModal v-model:open="verifyPrompt" :title="t('pray.verify_prompt_title')" :description="signupEmail ? t('pray.verify_prompt_body_email', { email: signupEmail }) : t('pray.verify_prompt_body')">
      <template #body>
        <div class="flex items-start gap-4">
          <UIcon name="i-lucide-mail-check" class="size-10 shrink-0 text-primary" />
          <p class="text-stone-700">{{ t('pray.verify_prompt_spam') }}</p>
        </div>
      </template>
      <template #footer>
        <UButton :label="t('pray.verify_prompt_ok')" @click="verifyPrompt = false" />
      </template>
    </UModal>
    <SharePrompt v-model:open="sharePrompt" :title="t('share.prompt_title')" :description="t('share.prompt_body')" />
  </article>
</template>
