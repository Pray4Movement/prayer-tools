<script setup lang="ts">
// Google / Apple sign-in; either gives an already verified email.
const props = defineProps<{ googleClientId: string | null, appleServicesId: string | null }>()
const emit = defineEmits<{ token: [provider: 'google' | 'apple', token: string] }>()
const { t } = useI18n()
const googleEl = ref<HTMLElement | null>(null)

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

interface GoogleId {
  initialize: (o: Record<string, unknown>) => void
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
}

onMounted(async () => {
  if (!props.googleClientId) return
  await loadScript('https://accounts.google.com/gsi/client')
  const gid = (window as unknown as { google?: { accounts: { id: GoogleId } } }).google?.accounts.id
  if (!gid || !googleEl.value) return
  gid.initialize({ client_id: props.googleClientId, callback: (r: { credential: string }) => emit('token', 'google', r.credential) })
  gid.renderButton(googleEl.value, { theme: 'outline', size: 'large', text: 'signup_with', locale: document.documentElement.lang })
})

interface AppleId {
  auth: { init: (o: Record<string, unknown>) => void, signIn: () => Promise<{ authorization: { id_token: string } }> }
}

async function apple() {
  await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js')
  const a = (window as unknown as { AppleID?: AppleId }).AppleID
  if (!a) return
  a.auth.init({ clientId: props.appleServicesId, scope: 'email', redirectURI: location.origin + location.pathname, usePopup: true })
  try {
    const res = await a.auth.signIn()
    emit('token', 'apple', res.authorization.id_token)
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-3">
      <div v-if="googleClientId" ref="googleEl" />
      <UButton v-if="appleServicesId" color="neutral" icon="i-lucide-apple" :label="t('signup.apple')" @click="apple" />
    </div>
    <USeparator :label="t('common.or')" />
  </div>
</template>
