import { describe, expect, it } from 'vitest'
import { isTemplateWhy, landingWhyDoc, templateWhyDoc, templateWhyText } from '../src/i18n/landing'
import { textDoc, tiptapToText } from '../src/tiptap'

const own = textDoc('Our own words.')

describe('landing why text', () => {
  it('uses the template text when the site has none of its own', () => {
    expect(tiptapToText(landingWhyDoc({}, 'ramadan', 'fr', 'en'))).toBe(templateWhyText('ramadan', 'fr'))
    expect(landingWhyDoc({ en: textDoc('') }, 'ramadan', 'en', 'en')).toEqual(templateWhyDoc('ramadan', 'en'))
  })

  it('falls back to the default language, and has nothing for templates without text', () => {
    expect(templateWhyText('ramadan', 'xx', 'es')).toBe(templateWhyText('ramadan', 'es'))
    expect(landingWhyDoc({}, 'generic', 'en', 'en')).toBeNull()
  })

  it('prefers the site\'s own text in the language or the default language', () => {
    expect(landingWhyDoc({ fr: own }, 'ramadan', 'fr', 'en')).toBe(own)
    expect(landingWhyDoc({ en: own }, 'ramadan', 'fr', 'en')).toBe(own)
    expect(landingWhyDoc({ fr: own }, 'ramadan', 'en', 'en')).toEqual(templateWhyDoc('ramadan', 'en'))
  })

  it('recognises the unchanged template text only in its own language', () => {
    expect(isTemplateWhy(templateWhyDoc('ramadan', 'ar'), 'ramadan', 'ar')).toBe(true)
    expect(isTemplateWhy(templateWhyDoc('ramadan', 'en'), 'ramadan', 'fr')).toBe(false)
    expect(isTemplateWhy(own, 'ramadan', 'en')).toBe(false)
  })
})
