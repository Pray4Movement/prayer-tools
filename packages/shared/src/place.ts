// How a site's place reads in each language: its name, and the phrases that
// say "in" and "of" it ("au Maroc", "du Maroc"). The right preposition depends
// on the place, so a site stores the wording a champion typed per language;
// anything left empty comes from the place name and the patterns here.
import { isLanguage } from './languages'

export interface PlaceWording {
  name?: string
  in?: string
  of?: string
}

export type SitePlaceWording = Record<string, PlaceWording>

// Per-language fallbacks; `{place}` is the place name in that language.
// Languages without a pattern use the bare name.
const IN_PATTERNS: Record<string, string> = {
  en: 'in {place}', es: 'en {place}', fr: 'à {place}', pt: 'em {place}', it: 'in {place}',
  nl: 'in {place}', de: 'in {place}', id: 'di {place}', ar: 'في {place}'
}
const OF_PATTERNS: Record<string, string> = {
  en: 'of {place}', es: 'de {place}', fr: 'de {place}', pt: 'de {place}', it: 'di {place}', nl: 'van {place}'
}

// Languages whose patterns read correctly for any place, so a missing phrase
// needs no attention.
export const RELIABLE_PLACE_LANGUAGES: readonly string[] = ['en']

export interface PlaceText {
  place: string
  inPlace: string
  ofPlace: string
}

// The place's name and phrases in a language: the site's wording, else the
// fallbacks built from the name.
export function placeText(name: string, wording: SitePlaceWording | null | undefined, lang: string): PlaceText {
  const w = wording?.[lang] ?? {}
  const place = w.name?.trim() || name
  const fill = (pattern: string | undefined) => (pattern ?? '{place}').replace('{place}', place)
  return {
    place,
    inPlace: w.in?.trim() || fill(IN_PATTERNS[lang]),
    ofPlace: w.of?.trim() || fill(OF_PATTERNS[lang])
  }
}

// Whether a language has both phrases written by the site.
export function hasPlacePhrases(wording: SitePlaceWording | null | undefined, lang: string): boolean {
  const w = wording?.[lang]
  return !!w?.in?.trim() && !!w?.of?.trim()
}

// Cleans submitted wording: known languages only, trimmed, empty values dropped.
export function parsePlaceWording(value: unknown): SitePlaceWording {
  const out: SitePlaceWording = {}
  if (!value || typeof value !== 'object') return out
  for (const [lang, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isLanguage(lang) || !raw || typeof raw !== 'object') continue
    const w: PlaceWording = {}
    for (const k of ['name', 'in', 'of'] as const) {
      const v = (raw as Record<string, unknown>)[k]
      if (typeof v === 'string' && v.trim()) w[k] = v.trim().slice(0, 200)
    }
    if (Object.keys(w).length) out[lang] = w
  }
  return out
}
