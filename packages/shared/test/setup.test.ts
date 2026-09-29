import { describe, expect, it } from 'vitest'
import { applyTemplate, campaignLength, campaignStatus, campaignsOverlap, displayLength, durationRule, pickCurrentCampaign, suggestCampaignSlug, validateSetup, type CampaignDates } from '../src/setup'

const NY = 'America/New_York'

function c(p: Partial<CampaignDates> & { id?: string }): CampaignDates & { id: string } {
  return { id: p.id ?? 'x', start_mode: 'date', start_date: '2026-03-01', end_mode: 'date', end_date: '2026-03-30', length_days: null, cadence: 'daily', timezone: NY, ended_at: null, ...p }
}

describe('displayLength', () => {
  it('shared-calendar campaigns ending within 50 days are fixed', () => {
    expect(displayLength(c({ start_date: '2026-03-01', end_date: '2026-04-20' }))).toBe('fixed')
    expect(displayLength(c({ start_date: '2026-03-01', end_date: '2026-04-21' }))).toBe('ongoing')
    expect(displayLength(c({ end_mode: 'none', end_date: null }))).toBe('ongoing')
    expect(displayLength(c({ start_mode: 'join', start_date: null, end_mode: 'days', end_date: null, length_days: 7 }))).toBe('ongoing')
  })
})

describe('campaignStatus', () => {
  it('follows the dates in the campaign timezone', () => {
    const k = c({ start_date: '2026-03-01', end_date: '2026-03-30' })
    // 04:30 UTC on 1 March is still 28 February in New York.
    expect(campaignStatus(k, new Date('2026-03-01T04:30:00Z'))).toBe('upcoming')
    expect(campaignStatus(k, new Date('2026-03-01T05:30:00Z'))).toBe('active')
    expect(campaignStatus(k, new Date('2026-03-31T03:30:00Z'))).toBe('active')
    expect(campaignStatus(k, new Date('2026-03-31T04:30:00Z'))).toBe('ended')
  })

  it('ended_at ends it; personal-start and open-ended campaigns stay active', () => {
    expect(campaignStatus(c({ ended_at: new Date('2026-03-10') }), new Date('2026-03-05T12:00:00Z'))).toBe('ended')
    expect(campaignStatus(c({ start_mode: 'join', start_date: null, end_mode: 'days', end_date: null, length_days: 7 }), new Date('2030-01-01'))).toBe('active')
    expect(campaignStatus(c({ end_mode: 'none', end_date: null }), new Date('2030-01-01'))).toBe('active')
  })
})

describe('pickCurrentCampaign', () => {
  const now = new Date('2026-06-15T12:00:00Z')
  const past = c({ id: 'past', start_date: '2026-01-01', end_date: '2026-01-30' })
  const older = c({ id: 'older', start_date: '2025-01-01', end_date: '2025-01-30' })
  const active = c({ id: 'active', start_date: '2026-06-01', end_date: '2026-06-30' })
  const next = c({ id: 'next', start_date: '2026-08-01', end_date: '2026-08-30' })
  const later = c({ id: 'later', start_date: '2026-10-01', end_date: '2026-10-30' })

  it('prefers the active campaign', () => {
    expect(pickCurrentCampaign([past, next, active], now)).toEqual({ campaign: active, state: 'active' })
  })

  it('else the next upcoming one', () => {
    expect(pickCurrentCampaign([later, past, next], now)).toEqual({ campaign: next, state: 'upcoming' })
  })

  it('else the most recently ended one', () => {
    expect(pickCurrentCampaign([older, past], now)).toEqual({ campaign: past, state: 'between' })
    expect(pickCurrentCampaign([], now)).toBeNull()
  })
})

describe('applyTemplate', () => {
  it('Ramadan: dates from the chosen start, 30 days, daily, people', () => {
    expect(applyTemplate('ramadan', { start_date: '2027-02-08', cadence: 'weekly', end_mode: 'none' })).toEqual({
      start_mode: 'date', start_date: '2027-02-08', end_mode: 'date', end_date: '2027-03-09', length_days: null, goal: 'people', cadence: 'daily', track_time: false
    })
  })

  it('4-day disaster ends three days after the start', () => {
    expect(applyTemplate('disaster_4', { start_date: '2026-09-28' }).end_date).toBe('2026-10-01')
  })

  it('demo: personal start for a number of days', () => {
    expect(applyTemplate('demo', { length_days: 10 })).toEqual({
      start_mode: 'join', start_date: null, end_mode: 'days', end_date: null, length_days: 10, goal: 'people', cadence: 'daily', track_time: false
    })
  })

  it('generic keeps choices and fixes contradictory end modes', () => {
    expect(applyTemplate('generic', { start_mode: 'join', end_mode: 'date', end_date: '2026-10-01', length_days: 5 })).toMatchObject({ start_mode: 'join', end_mode: 'days', end_date: null, start_date: null, length_days: 5 })
    expect(applyTemplate('generic', { start_mode: 'date', start_date: '2026-10-01', end_mode: 'days', length_days: 5 })).toMatchObject({ end_mode: 'date', length_days: null })
    expect(applyTemplate('unknown', { goal: 'coverage' }).goal).toBe('coverage')
  })

  it('validates the result', () => {
    expect(validateSetup(applyTemplate('ramadan', { start_date: '2027-02-08' }))).toEqual([])
    expect(validateSetup(applyTemplate('generic', { start_mode: 'date', start_date: '2026-10-01', end_date: '2026-09-01' }))).toEqual(['end_date'])
    expect(validateSetup(applyTemplate('demo', { length_days: 0 }))).toEqual(['length_days'])
  })
})

describe('derived answers', () => {
  it('campaign length in entries', () => {
    expect(campaignLength(c({ start_date: '2026-03-01', end_date: '2026-03-30' }))).toBe(30)
    expect(campaignLength(c({ start_date: '2026-03-01', end_date: '2026-03-30', cadence: 'weekly' }))).toBe(5)
    expect(campaignLength(c({ start_mode: 'join', end_mode: 'days', length_days: 7 }))).toBe(7)
    expect(campaignLength(c({ end_mode: 'none', end_date: null }))).toBeNull()
  })

  it('duration asked by goal', () => {
    expect(durationRule('people', false)).toBe('hidden')
    expect(durationRule('people', true)).toBe('optional')
    expect(durationRule('coverage', false)).toBe('required')
  })

  it('overlap and slugs', () => {
    expect(campaignsOverlap(c({ end_date: '2026-03-30' }), c({ start_date: '2026-03-30', end_date: '2026-04-10' }))).toBe(true)
    expect(campaignsOverlap(c({ end_date: '2026-03-29' }), c({ start_date: '2026-03-30', end_date: '2026-04-10' }))).toBe(false)
    expect(suggestCampaignSlug('2026-03-01', ['2026'])).toBe('2026-2')
  })
})
