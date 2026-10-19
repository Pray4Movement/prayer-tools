import { describe, expect, it } from 'vitest'
import { buildGrid, campaignWindow, coverageByDay, coveragePercent } from '../src/coverage'
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
