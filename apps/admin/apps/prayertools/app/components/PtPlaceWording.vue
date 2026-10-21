<script setup lang="ts">
// The place's name and its "in"/"of" phrases in each site language. Empty
// fields show the wording the site uses instead.
import { placeText, RELIABLE_PLACE_LANGUAGES, type PlaceWording, type SitePlaceWording } from '@prayertools/shared/place'

const wording = defineModel<SitePlaceWording>({ required: true })
const props = defineProps<{ placeName: string, languages: string[], disabled?: boolean }>()

const { data: meta } = usePtMeta()

const rows = computed(() => props.languages.map(code => ({
  code,
  name: languageName(meta.value, code),
  dir: meta.value?.languages.find(l => l.code === code)?.dir ?? 'ltr',
  fallback: placeText(props.placeName, { [code]: { name: wording.value[code]?.name } }, code),
  needsCheck: !RELIABLE_PLACE_LANGUAGES.includes(code)
})))

function set(code: string, key: keyof PlaceWording, value: string) {
  const next = Object.fromEntries(Object.entries({ ...wording.value[code], [key]: value }).filter(([, v]) => v?.trim())) as PlaceWording
  const rest = Object.fromEntries(Object.entries(wording.value).filter(([lang]) => lang !== code))
  wording.value = Object.keys(next).length ? { ...rest, [code]: next } : rest
}
</script>

<template>
  <div class="space-y-3">
    <div class="hidden sm:grid sm:grid-cols-[8rem_1fr_1fr_1fr] gap-2 text-xs font-medium text-(--ui-text-muted)">
      <span>Language</span>
      <span>Name</span>
      <span>“In” the place</span>
      <span>“Of” the place</span>
    </div>
    <div
      v-for="r in rows"
      :key="r.code"
      class="grid gap-2 sm:grid-cols-[8rem_1fr_1fr_1fr] sm:items-center"
    >
      <span class="text-sm font-medium">{{ r.name }}</span>
      <UInput
        :model-value="wording[r.code]?.name ?? ''"
        :placeholder="placeName"
        :dir="r.dir"
        :disabled="disabled"
        :aria-label="`Place name in ${r.name}`"
        @update:model-value="(v) => set(r.code, 'name', String(v ?? ''))"
      />
      <UInput
        :model-value="wording[r.code]?.in ?? ''"
        :placeholder="r.fallback.inPlace"
        :dir="r.dir"
        :disabled="disabled"
        :color="r.needsCheck && !wording[r.code]?.in ? 'warning' : 'primary'"
        :highlight="r.needsCheck && !wording[r.code]?.in"
        :aria-label="`“In” phrase in ${r.name}`"
        @update:model-value="(v) => set(r.code, 'in', String(v ?? ''))"
      />
      <UInput
        :model-value="wording[r.code]?.of ?? ''"
        :placeholder="r.fallback.ofPlace"
        :dir="r.dir"
        :disabled="disabled"
        :color="r.needsCheck && !wording[r.code]?.of ? 'warning' : 'primary'"
        :highlight="r.needsCheck && !wording[r.code]?.of"
        :aria-label="`“Of” phrase in ${r.name}`"
        @update:model-value="(v) => set(r.code, 'of', String(v ?? ''))"
      />
    </div>
    <p class="text-xs text-(--ui-text-muted)">
      For example “Maroc”, “au Maroc” and “du Maroc” in French. Content fills these into {place}, {in_place} and {of_place}. Empty fields use the grey suggestion, which may not be grammatical outside English.
    </p>
  </div>
</template>
