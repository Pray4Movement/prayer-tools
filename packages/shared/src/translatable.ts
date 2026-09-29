// Champion-written text: written in one language, translated into the site's
// others (by AI or by hand). Editing the source flags the other languages as
// out of date instead of overwriting them.
import type { TranslatableText } from './db/schema'

export function textIn(t: TranslatableText | null | undefined, lang: string, fallback?: string): string {
  if (!t) return ''
  return t.values[lang] || (fallback ? t.values[fallback] : '') || t.values[t.source] || ''
}

export function makeText(lang: string, value: string): TranslatableText {
  return { source: lang, values: { [lang]: value }, stale: [] }
}

// Sets a value. Writing the source language marks every other language stale;
// writing another language clears its stale flag.
export function setText(t: TranslatableText | null | undefined, lang: string, value: string): TranslatableText {
  const base: TranslatableText = t ? { source: t.source, values: { ...t.values }, stale: [...(t.stale ?? [])] } : makeText(lang, '')
  const changed = base.values[lang] !== value
  base.values[lang] = value
  if (lang === base.source) {
    if (changed) base.stale = Object.keys(base.values).filter(l => l !== lang && base.values[l])
  } else {
    base.stale = (base.stale ?? []).filter(l => l !== lang)
  }
  return base
}

export function isStale(t: TranslatableText | null | undefined, lang: string): boolean {
  return !!t?.stale?.includes(lang)
}

export function missingLanguages(t: TranslatableText | null | undefined, languages: string[]): string[] {
  return languages.filter(l => !t?.values[l])
}

// Normalizes client input into a TranslatableText, dropping unknown shapes.
export function parseText(input: unknown): TranslatableText | null {
  if (!input || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  if (typeof o.source !== 'string' || !o.values || typeof o.values !== 'object') return null
  const values: Record<string, string> = {}
  for (const [k, v] of Object.entries(o.values as Record<string, unknown>)) {
    if (typeof v === 'string' && /^[a-z]{2,3}(-[a-z]{2,4})?$/.test(k)) values[k] = v.slice(0, 20_000)
  }
  const stale = Array.isArray(o.stale) ? (o.stale as unknown[]).filter((s): s is string => typeof s === 'string') : []
  return { source: o.source, values, stale }
}
