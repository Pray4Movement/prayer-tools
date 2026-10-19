// Landing page sections, in their fixed order. The list and defaults live in
// code; a site stores only its content, the sections it hid and its custom
// sections. Sections with nothing to show hide themselves.
import { getTemplate } from './setup'

export const LANDING_SECTIONS = ['top', 'why', 'custom', 'stories', 'how', 'signup', 'today', 'share', 'contact', 'app'] as const
export type LandingSection = typeof LANDING_SECTIONS[number]

// Sections a champion may hide. The top section always shows.
export const HIDEABLE_SECTIONS: readonly LandingSection[] = ['why', 'custom', 'stories', 'how', 'today', 'share', 'contact', 'app']

export function visibleSections(hidden: string[] | undefined, templateKey: string | null | undefined, opts: { hasStories: boolean, hasCustom: boolean, hasWhy: boolean, appAvailable: boolean }): LandingSection[] {
  const hiddenSet = new Set(hidden ?? getTemplate(templateKey).hiddenSections)
  return LANDING_SECTIONS.filter((s) => {
    if (s === 'top' || s === 'signup') return true
    if (hiddenSet.has(s)) return false
    if (s === 'why') return opts.hasWhy
    if (s === 'custom') return opts.hasCustom
    if (s === 'stories') return opts.hasStories
    if (s === 'app') return opts.appAvailable
    return true
  })
}
