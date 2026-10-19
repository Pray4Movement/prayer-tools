<script setup lang="ts">
import type { Editor, JSONContent } from '@tiptap/vue-3'
import type { EditorToolbarItem } from '@nuxt/ui'
import type { MarketingDoc, MarketingVariable } from '../utils/marketing-ui'

const props = withDefaults(defineProps<{
  variables?: MarketingVariable[]
  dir?: 'ltr' | 'rtl'
  disabled?: boolean
}>(), { variables: () => [], dir: 'ltr', disabled: false })

const model = defineModel<MarketingDoc>({ required: true })

// UEditor types its JSON as Tiptap's `Content`; the stored shape is the same document.
const doc = computed({
  get: () => model.value as unknown as JSONContent,
  set: (v) => { model.value = v as unknown as MarketingDoc }
})

const items: EditorToolbarItem[][] = [
  [
    { 'kind': 'undo', 'icon': 'i-lucide-undo', 'aria-label': 'Undo' },
    { 'kind': 'redo', 'icon': 'i-lucide-redo', 'aria-label': 'Redo' }
  ],
  [
    {
      'icon': 'i-lucide-heading',
      'aria-label': 'Text style',
      'content': { align: 'start' },
      'items': [
        { kind: 'paragraph', label: 'Paragraph', icon: 'i-lucide-type' },
        { kind: 'heading', level: 2, label: 'Heading', icon: 'i-lucide-heading-2' },
        { kind: 'heading', level: 3, label: 'Subheading', icon: 'i-lucide-heading-3' }
      ]
    } as EditorToolbarItem,
    { 'kind': 'mark', 'mark': 'bold', 'icon': 'i-lucide-bold', 'aria-label': 'Bold' },
    { 'kind': 'mark', 'mark': 'italic', 'icon': 'i-lucide-italic', 'aria-label': 'Italic' },
    { 'kind': 'mark', 'mark': 'underline', 'icon': 'i-lucide-underline', 'aria-label': 'Underline' },
    { 'kind': 'link', 'icon': 'i-lucide-link', 'aria-label': 'Link' }
  ],
  [
    { 'kind': 'bulletList', 'icon': 'i-lucide-list', 'aria-label': 'Bullet list' },
    { 'kind': 'orderedList', 'icon': 'i-lucide-list-ordered', 'aria-label': 'Numbered list' },
    { 'kind': 'blockquote', 'icon': 'i-lucide-text-quote', 'aria-label': 'Quote' },
    { 'kind': 'horizontalRule', 'icon': 'i-lucide-minus', 'aria-label': 'Divider' }
  ]
]

function insert(editor: Editor, key: string) {
  editor.chain().focus().insertContent(`{${key}}`).run()
}
</script>

<template>
  <div
    class="rounded-md border border-(--ui-border) bg-(--ui-bg)"
    :class="props.disabled ? 'opacity-70 pointer-events-none' : ''"
  >
    <UEditor
      v-slot="{ editor }"
      v-model="doc"
      content-type="json"
      placeholder="Write your email…"
      :editable="!props.disabled"
      :text-direction="props.dir"
      :ui="{ base: 'px-4 py-3 prose-sm max-w-none focus:outline-none min-h-64' }"
    >
      <div class="flex flex-wrap items-center gap-1 border-b border-(--ui-border) px-2 py-1 sticky top-0 bg-(--ui-bg) z-10">
        <UEditorToolbar
          :editor="editor"
          :items="items"
        />
        <UDropdownMenu
          v-if="props.variables.length"
          :items="props.variables.map(v => ({ label: `${v.label}  {${v.key}}`, onSelect: () => insert(editor, v.key) }))"
        >
          <UButton
            icon="i-lucide-braces"
            color="neutral"
            variant="ghost"
            size="sm"
            label="Insert"
            aria-label="Insert a placeholder"
          />
        </UDropdownMenu>
      </div>
    </UEditor>
  </div>
</template>
