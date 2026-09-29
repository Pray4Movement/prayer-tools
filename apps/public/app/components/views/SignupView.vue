<script setup lang="ts">
import type { SignupFormView } from '~~/shared/view'

defineProps<{ form: SignupFormView }>()
const { site, st } = useSite()
const { t } = useI18n()
useHead({ title: () => `${st('landing.signup.title')} · ${site.value.name}` })
const appAvailable = computed(() => !!(site.value.appStoreUrl || site.value.playStoreUrl))
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-10 space-y-8">
    <header class="space-y-2">
      <h1 class="text-3xl font-bold">{{ st('landing.signup.title') }}</h1>
      <p v-if="site.campaign" class="text-stone-600">{{ site.campaign.name }}</p>
      <p class="text-stone-700">{{ st('landing.signup.intro', { site: site.name }) }}</p>
    </header>
    <UAlert v-if="!form.open || !site.campaign" color="neutral" variant="soft" :title="t('signup.closed')" />
    <template v-else>
      <section v-if="appAvailable" class="rounded-xl bg-white border border-stone-200 p-5 space-y-2" aria-labelledby="app-way">
        <h2 id="app-way" class="font-semibold">{{ t('signup.app_way') }}</h2>
        <AppLinks />
      </section>
      <section aria-labelledby="web-way" class="space-y-4">
        <h2 v-if="appAvailable" id="web-way" class="font-semibold">{{ t('signup.web_way') }}</h2>
        <SignupForm :form="form" />
      </section>
    </template>
  </div>
</template>
