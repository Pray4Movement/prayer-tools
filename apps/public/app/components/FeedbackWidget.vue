<script setup lang="ts">
// The Prayer.Tools feedback widget (Nuxtinator feedback web component) with
// context about the page it was opened on.
const { site } = useSite()
const route = useRoute()
const { t } = useI18n()

const config = computed(() => {
  const f = site.value.feedback!
  return JSON.stringify({ profile: 'chat-bubble', instanceId: 'fb-1', projectId: f.projectId, apiBase: f.apiBase, enabled: true, showByDefault: true })
})

// The component takes no context field, so the page context rides along as
// data attributes on the slot.
const context = computed(() => ({
  'data-site-id': site.value.orgId,
  'data-site-slug': site.value.slug,
  'data-campaign-id': site.value.campaign?.id ?? '',
  'data-page': route.path,
  'data-content-day': route.path.match(/\/pray\/(\d+)/)?.[1] ?? '',
  'data-language': site.value.lang,
  'data-browser': navigator.userAgent,
  'title': t('feedback.intro')
}))

onMounted(() => {
  const f = site.value.feedback
  if (!f || document.querySelector('script[data-pt-feedback]')) return
  const s = document.createElement('script')
  s.src = f.scriptUrl
  s.defer = true
  s.dataset.ptFeedback = '1'
  document.head.appendChild(s)
})
</script>

<template>
  <div class="feedback-widget-slot" v-bind="context">
    <feedback-web-component :profile-config="config" />
  </div>
</template>
