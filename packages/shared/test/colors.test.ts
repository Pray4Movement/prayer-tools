import { describe, expect, it } from 'vitest'
import { BRAND_COLOR_PRESETS, brandColor, randomBrandColor } from '../src/colors'

describe('randomBrandColor', () => {
  it('picks one of the presets', () => {
    for (let i = 0; i < 50; i++) expect(BRAND_COLOR_PRESETS).toContain(randomBrandColor())
  })

  it('only offers presets readable on a white page', () => {
    for (const c of BRAND_COLOR_PRESETS) expect(brandColor(c).tooPale).toBe(false)
  })
})
