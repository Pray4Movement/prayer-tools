import { describe, expect, it } from 'vitest'
import { buildGrid, campaignWindow, coverageByDay, coverageByTimeOfDay, coveragePercent, openOccurrences } from '../src/coverage'
import type { CommitmentRule } from '../src/schedule'

const NY = 'America/New_York'

function daily(time: string, minutes: number, tz = NY): CommitmentRule {
  return { kind: 'recurring', frequency: 'daily', days_of_week: [], time, timezone: tz, duration_min: minutes, dates: [], starts_on: '2026-01-01', ends_on: null }
}

describe('coverage grid', () => {
  it('a normal day has 96 slots, the spring DST day 92, the autumn DST day 100', () => {
    expect(buildGrid('2026-03-07', '2026-03-07', NY, []).slots).toHaveLength(96)
    expect(buildGrid('2026-03-08', '2026-03-08', NY, []).slots).toHaveLength(92)
    expect(buildGrid('2026-11-01', '2026-11-01', NY, []).slots).toHaveLength(100)
    expect(buildGrid('2026-03-29', '2026-03-29', 'Europe/London', []).slots).toHaveLength(92)
    expect(buildGrid('2026-10-25', '2026-10-25', 'Europe/London', []).slots).toHaveLength(100)
  })

  it('splits a multi-day grid into calendar days in the campaign timezone', () => {
    const grid = buildGrid('2026-03-07', '2026-03-09', NY, [daily('07:00', 30)])
    const days = coverageByDay(grid, '2026-03-07', '2026-03-09', NY)
    expect(days.map(d => d.slots.length)).toEqual([96, 92, 96])
    // 07:00–07:30 is two slots each day, at local slot 28 whatever the offset.
    for (const d of days) {
      expect(d.slots.filter(n => n > 0)).toHaveLength(2)
    }
    expect(days[0]!.slots[28]).toBe(1)
    expect(days[1]!.slots[24]).toBe(1)
    expect(days[2]!.slots[28]).toBe(1)
  })

  it('a commitment in another timezone keeps its own clock across the campaign DST change', () => {
    // 12:00 in London is 07:00 in New York until the US change on 8 March, then 08:00:
    // 7 real hours after midnight on the 23-hour day, 8 hours the day after.
    const grid = buildGrid('2026-03-06', '2026-03-09', NY, [daily('12:00', 15, 'Europe/London')])
    const days = coverageByDay(grid, '2026-03-06', '2026-03-09', NY)
    const covered = days.map(d => d.slots.findIndex(n => n > 0))
    expect(covered).toEqual([28, 28, 28, 32])
  })

  it('counts overlapping intercessors per slot and computes the covered share', () => {
    const grid = buildGrid('2026-03-10', '2026-03-10', NY, [daily('00:00', 60), daily('00:30', 60)])
    expect(grid.slots.slice(0, 7)).toEqual([1, 1, 2, 2, 1, 1, 0])
    expect(coveragePercent(grid.slots)).toBe(Math.round(6 / 96 * 1000) / 10)
    expect(coveragePercent([])).toBe(0)
  })

  it('paused rules add nothing; the window is real instants', () => {
    expect(buildGrid('2026-03-10', '2026-03-10', NY, [{ ...daily('00:00', 60), paused: true }]).slots.every(n => n === 0)).toBe(true)
    const w = campaignWindow('2026-03-08', '2026-03-08', NY)
    expect((w.end.getTime() - w.start.getTime()) / 3600_000).toBe(23)
  })

  it('a pick crossing midnight before the start still marks the first slot', () => {
    const pick: CommitmentRule = { ...daily('00:00', 30), kind: 'dates', frequency: null, dates: ['2026-03-10T03:50:00Z'] }
    const grid = buildGrid('2026-03-10', '2026-03-10', NY, [pick])
    // 23:50 EDT on 9 March for 30 minutes covers 00:00–00:20 on 10 March.
    expect(grid.slots.slice(0, 3)).toEqual([1, 1, 0])
  })
})

describe('slot lengths', () => {
  it('a day has 288 five-minute slots and 24 hour-long slots', () => {
    expect(buildGrid('2026-03-10', '2026-03-10', NY, [], 15, 5).slots).toHaveLength(288)
    expect(buildGrid('2026-03-10', '2026-03-10', NY, [], 15, 60).slots).toHaveLength(24)
    const grid = buildGrid('2026-03-10', '2026-03-11', NY, [daily('07:00', 10)], 15, 5)
    expect(grid.slotMinutes).toBe(5)
    expect(coverageByDay(grid, '2026-03-10', '2026-03-11', NY).map(d => d.slots.filter(n => n > 0).length)).toEqual([2, 2])
  })
})

describe('coverage by time of day', () => {
  const grid = buildGrid('2026-03-07', '2026-03-10', NY, [daily('07:00', 30)])
  const counts = { start: grid.start.toISOString(), slotMinutes: 15, slots: grid.slots }
  const from = new Date('2026-03-07T05:00:00Z')

  it('counts every coming day at each local time, across DST', () => {
    const rows = coverageByTimeOfDay(counts, NY, from)
    expect(rows.find(r => r.minute === 7 * 60)).toEqual({ minute: 420, total: 4, covered: 4 })
    expect(rows.find(r => r.minute === 7 * 60 + 30)).toEqual({ minute: 450, total: 4, covered: 0 })
    // 02:00 does not exist on the spring DST day.
    expect(rows.find(r => r.minute === 2 * 60)!.total).toBe(3)
  })

  it('reads the same slots in another timezone', () => {
    const rows = coverageByTimeOfDay(counts, 'Europe/London', from)
    expect(rows.filter(r => r.covered > 0).map(r => r.minute)).toEqual([11 * 60, 11 * 60 + 15, 12 * 60, 12 * 60 + 15])
  })

  it('skips slots before now and keeps only the chosen weekdays', () => {
    expect(coverageByTimeOfDay(counts, NY, new Date('2026-03-09T04:00:00Z')).find(r => r.minute === 420)!.total).toBe(2)
    // 2026-03-08 is a Sunday.
    expect(coverageByTimeOfDay(counts, NY, from, [0]).find(r => r.minute === 420)!.total).toBe(1)
  })

  it('an occurrence is open when any slot of its length has nobody', () => {
    expect(openOccurrences(counts, NY, from, 420, 30)).toEqual({ total: 4, open: 0 })
    expect(openOccurrences(counts, NY, from, 420, 45)).toEqual({ total: 4, open: 4 })
    expect(openOccurrences(counts, NY, from, 6 * 60 + 45, 30)).toEqual({ total: 4, open: 4 })
  })
})
