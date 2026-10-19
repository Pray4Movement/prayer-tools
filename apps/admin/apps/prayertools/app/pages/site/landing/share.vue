<script setup lang="ts">
// Share: the live link, QR codes, share messages per language (with a
// WhatsApp link), and the Give line.
import type { TranslatableText } from '@prayertools/shared/db/schema'

definePageMeta({ middleware: 'auth' })

const { data: site, can, refresh: refreshSite } = usePtSite()
const { data: meta } = usePtMeta()
const toast = usePtToast()
const { data } = useFetch<{ url: string, qrPng: string, qrSvg: string, share: { messages?: TranslatableText }, languages: string[], defaultLanguage: string, donateUrl: string }>('/api/pt/share', { key: 'pt-share' })

const messages = ref<TranslatableText | null>(null)
watch(data, d => { messages.value = d?.share.messages ?? null }, { immediate: true })
const lang = ref('en')
watch(data, d => { if (d) lang.value = d.defaultLanguage }, { immediate: true })

const message = computed(() => messages.value?.values[lang.value] || `Pray with us: ${site.value?.org.name}`)
const whatsapp = computed(() => `https://wa.me/?text=${encodeURIComponent(`${message.value} ${data.value?.url ?? ''}`)}`)

async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  toast.ok('Copied')
}
function downloadSvg() {
  const blob = new Blob([data.value?.qrSvg ?? ''], { type: 'image/svg+xml' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${site.value?.org.slug}-qr.svg`
  a.click()
}
const saving = ref(false)
async function save() {
  saving.value = true
  try {
    await $fetch('/api/pt/site', { method: 'PATCH', body: { share: { ...(site.value?.site.share ?? {}), messages: messages.value } } })
    await refreshSite()
    toast.ok('Saved')
  } catch (err) {
    toast.fail(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    v-if="data && site"
    class="max-w-4xl mx-auto space-y-6"
  >
    <PtLandingTabs />
    <h1 class="text-2xl font-semibold">
      Share
    </h1>
    <UAlert
      v-if="site.site.status !== 'published'"
      color="warning"
      variant="soft"
      description="Your site isn't published yet; people who open the link will not see it."
    />
    <UCard>
      <div class="grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <div class="space-y-3">
          <UFormField label="Your site's link">
            <div class="flex gap-2">
              <UInput
                :model-value="data.url"
                readonly
                class="flex-1"
              />
              <UButton
                icon="i-lucide-copy"
                label="Copy"
                variant="soft"
                @click="copy(data.url)"
              />
            </div>
          </UFormField>
          <p class="text-sm text-(--ui-text-muted)">
            When your own domain is active, this becomes the main address and the prayer.tools address redirects to it.
          </p>
        </div>
        <div class="text-center space-y-2">
          <img
            :src="data.qrPng"
            alt="QR code for your site"
            class="size-40 mx-auto"
          >
          <div class="flex gap-1 justify-center">
            <UButton
              size="xs"
              variant="soft"
              :href="data.qrPng"
              :download="`${site.org.slug}-qr.png`"
              label="PNG"
            />
            <UButton
              size="xs"
              variant="soft"
              label="SVG"
              @click="downloadSvg"
            />
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          Share message
        </h2>
        <p class="text-sm text-(--ui-text-muted)">
          Pre-filled when people share your site from their phone, in their language.
        </p>
      </template>
      <div class="space-y-4">
        <PtTranslatableInput
          v-model="messages"
          :languages="site.site.languages"
          :default-language="site.site.default_language"
          label="Message"
          multiline
          :source-locked="!can('pt.site.write')"
        />
        <div class="flex flex-wrap items-center gap-2">
          <USelect
            v-model="lang"
            :items="site.site.languages.map(l => ({ label: languageName(meta, l), value: l }))"
            class="w-44"
          />
          <UButton
            :href="whatsapp"
            target="_blank"
            icon="i-simple-icons-whatsapp"
            label="Share on WhatsApp"
            color="success"
            variant="soft"
          />
          <UButton
            icon="i-lucide-copy"
            variant="soft"
            label="Copy message"
            @click="copy(`${message} ${data.url}`)"
          />
        </div>
        <div
          v-if="can('pt.site.write')"
          class="flex justify-end"
        >
          <UButton
            label="Save"
            :loading="saving"
            @click="save"
          />
        </div>
      </div>
    </UCard>

    <UCard>
      <div class="flex items-center gap-3 text-sm">
        <UIcon
          name="i-lucide-heart"
          class="size-5 text-(--ui-primary)"
        />
        <span>Prayer.Tools is free and kept running by gifts.</span>
        <UButton
          :href="data.donateUrl"
          target="_blank"
          size="sm"
          variant="link"
          label="Give"
        />
      </div>
    </UCard>
  </div>
</template>
