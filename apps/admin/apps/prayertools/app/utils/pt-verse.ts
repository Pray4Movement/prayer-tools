// Scripture block for the editor: verses with a reference and translation.
// Rendered by the shared renderer as a `verse` node; never AI-translated.
import { Node, mergeAttributes } from '@tiptap/core'

export const PtVerse = Node.create({
  name: 'verse',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      reference: { default: null, parseHTML: el => el.getAttribute('data-reference'), renderHTML: a => (a.reference ? { 'data-reference': a.reference } : {}) },
      translation: { default: null, parseHTML: el => el.getAttribute('data-translation'), renderHTML: a => (a.translation ? { 'data-translation': a.translation } : {}) }
    }
  },
  parseHTML() {
    return [{ tag: 'blockquote[data-type="verse"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes({ 'data-type': 'verse', 'class': 'pt-verse' }, HTMLAttributes), 0]
  }
})
