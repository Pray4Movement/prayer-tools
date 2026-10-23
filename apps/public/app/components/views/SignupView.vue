<script setup lang="ts">
import type { SignupFormView } from '~~/shared/view'

defineProps<{ form: SignupFormView }>()
const { site, st, date } = useSite()
const { t } = useI18n()
useHead({ title: () => `${st('landing.signup.title')} · ${site.value.name}` })
const startNote = computed(() => site.value.campaign?.state === 'upcoming' && site.value.campaign.startDate ? t('signup.starts_on', { date: date(site.value.campaign.startDate) }) : '')
const appAvailable = computed(() => !!(site.value.appStoreUrl || site.value.playStoreUrl))

const route = useRoute()
const confirmed = computed(() => route.query.confirmed === '1')
const sharePrompt = ref(false)
const joined = ref(false)
const needsVerify = ref(false)
const verifyPrompt = ref(false)
const formKey = ref(0)
const signupEmail = useState<string | null>('pt-signup-email', () => null)

function onJoined(verify: boolean) {
  joined.value = true
  needsVerify.value = verify
  formKey.value++
  window.scrollTo({ top: 0, behavior: 'smooth' })
  if (verify) verifyPrompt.value = true
  else if (site.value.settings.sharePrompts) setTimeout(() => (sharePrompt.value = true), 1200)
}

onMounted(() => {
  if (confirmed.value && site.value.settings.sharePrompts) setTimeout(() => (sharePrompt.value = true), 1200)
  dropQueryParams('confirmed')
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-10 space-y-8">
    <UAlert v-if="joined && needsVerify" color="warning" variant="soft" icon="i-lucide-mail" :title="t('pray.check_email_title')" :description="t('pray.check_email_body_not_started')" role="status" />
    <UAlert v-else-if="joined" color="success" variant="soft" icon="i-lucide-check" :title="st('signup.success')" role="status" />
    <UAlert v-if="confirmed" color="success" variant="soft" icon="i-lucide-badge-check" :title="t('pray.confirmed_title')" :description="t('pray.confirmed_body')" role="status" />
    <header class="space-y-2">
      <h1 class="text-3xl font-bold">{{ st('landing.signup.title') }}</h1>
      <p v-if="site.campaign" class="text-stone-600">{{ site.campaign.name }}</p>
      <p class="text-stone-700">{{ startNote || st('landing.signup.intro', { site: site.name }) }}</p>
    </header>
    <UAlert v-if="!form.open || !site.campaign" color="neutral" variant="soft" :title="t('signup.closed')" />
    <template v-else>
      <section v-if="appAvailable" class="rounded-xl bg-white border border-stone-200 p-5 space-y-2" aria-labelledby="app-way">
        <h2 id="app-way" class="font-semibold">{{ t('signup.app_way') }}</h2>
        <AppLinks />
      </section>
      <section aria-labelledby="web-way" class="space-y-4">
        <h2 v-if="appAvailable" id="web-way" class="font-semibold">{{ t('signup.web_way') }}</h2>
        <SignupForm :key="formKey" :form="form" @joined="onJoined" />
      </section>
    </template>
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
  </div>
</template>
