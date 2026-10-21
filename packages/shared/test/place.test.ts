import { describe, expect, it } from 'vitest'
import { hasPlacePhrases, parsePlaceWording, placeText } from '../src/place'
import { placeholderVars } from '../src/content'

describe('place wording', () => {
  it('uses the site\'s wording for the language', () => {
    const wording = { fr: { name: 'Maroc', in: 'au Maroc', of: 'du Maroc' } }
    expect(placeText('Morocco', wording, 'fr')).toEqual({ place: 'Maroc', inPlace: 'au Maroc', ofPlace: 'du Maroc' })
  })

  it('builds missing phrases from the name in that language', () => {
    expect(placeText('Morocco', {}, 'en')).toEqual({ place: 'Morocco', inPlace: 'in Morocco', ofPlace: 'of Morocco' })
    expect(placeText('Morocco', { fr: { name: 'Maroc' } }, 'fr')).toEqual({ place: 'Maroc', inPlace: 'à Maroc', ofPlace: 'de Maroc' })
    expect(placeText('Москва', {}, 'ru')).toEqual({ place: 'Москва', inPlace: 'Москва', ofPlace: 'Москва' })
  })

  it('keeps only known languages and non-empty values', () => {
    expect(parsePlaceWording({ fr: { name: ' Maroc ', in: '', of: 'du Maroc' }, xx: { name: 'a' }, es: { in: '  ' } }))
      .toEqual({ fr: { name: 'Maroc', of: 'du Maroc' } })
    expect(parsePlaceWording('nope')).toEqual({})
  })

  it('needs both phrases to count as written', () => {
    expect(hasPlacePhrases({ fr: { in: 'au Maroc' } }, 'fr')).toBe(false)
    expect(hasPlacePhrases({ fr: { in: 'au Maroc', of: 'du Maroc' } }, 'fr')).toBe(true)
  })

  it('fills the place placeholders in the language shown', () => {
    const vars = placeholderVars({ siteName: 'Pray for Morocco', campaignName: 'Ramadan', lang: 'fr', place: 'Morocco', placeWording: { fr: { name: 'Maroc', in: 'au Maroc', of: 'du Maroc' } } })
    expect(vars).toMatchObject({ place: 'Maroc', in_place: 'au Maroc', of_place: 'du Maroc', people_group: 'Maroc' })
    expect(placeholderVars({ siteName: 'Site', campaignName: 'C', lang: 'en' })).toMatchObject({ place: 'Site', in_place: 'in Site' })
  })
})
