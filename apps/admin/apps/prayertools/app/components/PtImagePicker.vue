<script setup lang="ts">
// Picks an image from the champion's personal library, or uploads one.
// Uploads always go to the personal library so they can be reused on any site.
interface Asset {
  id: string
  url: string
  url_small: string | null
  alt: { source: string, values: Record<string, string> } | null
  credit: string | null
  focal_x: number
  focal_y: number
}

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ select: [{ url: string, alt: string, credit: string | null, asset: Asset }] }>()
const props = withDefaults(defineProps<{ language?: string }>(), { language: 'en' })

const { data, refresh, status } = useFetch<{ assets: Asset[] }>('/api/pt/assets', { immediate: false, key: 'pt-assets' })
watch(open, (o) => { if (o) refresh() })

const file = ref<File | null>(null)
const alt = ref('')
const credit = ref('')
const uploading = ref(false)
const toast = usePtToast()

function altOf(a: Asset): string {
  return a.alt?.values[props.language] || a.alt?.values[a.alt?.source ?? ''] || ''
}

async function upload() {
  if (!file.value || !alt.value.trim()) return
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', file.value)
    form.append('alt', JSON.stringify({ source: props.language, values: { [props.language]: alt.value.trim() } }))
    if (credit.value.trim()) form.append('credit', credit.value.trim())
    const res = await $fetch<{ asset: Asset }>('/api/pt/assets', { method: 'POST', body: form })
    file.value = null
    alt.value = ''
    credit.value = ''
    await refresh()
    choose(res.asset)
  } catch (err) {
    toast.fail(err, 'Upload failed')
  } finally {
    uploading.value = false
  }
}

function choose(a: Asset) {
  emit('select', { url: a.url, alt: altOf(a), credit: a.credit, asset: a })
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Images"
    description="Your image library. Images you upload can be reused on any of your sites."
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <div class="space-y-6">
        <div class="rounded-md border border-dashed border-(--ui-border-accented) p-4 space-y-3">
          <UFileUpload
            v-model="file"
            accept="image/*"
            label="Upload an image"
            description="JPEG, PNG, WebP or GIF up to 12 MB. It is resized for slow connections."
            class="w-full min-h-32"
          />
          <div class="grid sm:grid-cols-2 gap-3">
            <UFormField
              label="Describe the image"
              help="Read aloud to people who can't see it."
              required
            >
              <UInput
                v-model="alt"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Credit (optional)">
              <UInput
                v-model="credit"
                placeholder="Photo: …"
                class="w-full"
              />
            </UFormField>
          </div>
          <UButton
            label="Upload and use"
            icon="i-lucide-upload"
            :loading="uploading"
            :disabled="!file || !alt.trim()"
            @click="upload"
          />
        </div>
        <div
          v-if="status === 'pending'"
          class="text-sm text-(--ui-text-muted)"
        >
          Loading…
        </div>
        <div
          v-else-if="!data?.assets.length"
          class="text-sm text-(--ui-text-muted)"
        >
          No images yet.
        </div>
        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <button
            v-for="a in data.assets"
            :key="a.id"
            type="button"
            class="group relative aspect-square overflow-hidden rounded-md border border-(--ui-border) focus-visible:ring-2 focus-visible:ring-(--ui-primary)"
            :aria-label="`Use ${altOf(a) || 'image'}`"
            @click="choose(a)"
          >
            <img
              :src="a.url_small || a.url"
              :alt="altOf(a)"
              class="size-full object-cover"
              :style="{ objectPosition: `${a.focal_x * 100}% ${a.focal_y * 100}%` }"
              loading="lazy"
            >
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>
