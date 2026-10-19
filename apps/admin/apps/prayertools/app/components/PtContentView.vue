<script setup lang="ts">
// Read-only rendering of Tiptap content with the shared renderer (the same
// HTML the public site shows).
import { tiptapToHtml } from '@prayertools/shared/tiptap'

const props = defineProps<{ doc: Record<string, any> | null, vars?: Record<string, string> }>()
const html = computed(() => tiptapToHtml(props.doc as never, { mode: 'web', vars: props.vars }))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- output of the shared renderer, which escapes all text -->
  <div
    class="pt-content prose prose-sm max-w-none dark:prose-invert"
    v-html="html"
  />
</template>

<style>
.pt-content blockquote.verse { border-inline-start: 4px solid var(--ui-border-accented); background: var(--ui-bg-elevated); padding: .5rem 1rem; border-radius: .25rem; }
.pt-content .verse-ref { display: block; font-size: .8rem; color: var(--ui-text-muted); font-style: normal; margin-top: .25rem; }
.pt-content h2 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 .5rem; }
.pt-content h3 { font-size: 1.1rem; font-weight: 600; margin: .75rem 0 .5rem; }
.pt-content p { margin: .5rem 0; }
.pt-content ul { list-style: disc; padding-inline-start: 1.5rem; }
.pt-content ol { list-style: decimal; padding-inline-start: 1.5rem; }
.pt-content img { max-width: 100%; border-radius: .375rem; }
</style>
