// 24/7 coverage: the campaign is a grid of real 15-minute instants from its
// start to its end in the campaign's timezone (a DST day simply has 92 or 100
// slots). Each commitment occurrence marks the slots it overlaps; coverage is
// the share of slots with at least one intercessor.
import { addDays, zonedInstant } from './dates'
import { occurrences, type CommitmentRule } from './schedule'

export const SLOT_MS = 15 * 60_000

export interface CoverageGrid {
  start: Date
  end: Date
  // Intercessor count per slot.
  slots: number[]
}

export function campaignWindow(startDate: string, endDate: string, tz: string): { start: Date, end: Date } {
  return { start: zonedInstant(startDate, '00:00', tz), end: zonedInstant(addDays(endDate, 1), '00:00', tz) }
}

export function buildGrid(
  startDate: string,
  endDate: string,
  tz: string,
  rules: CommitmentRule[],
  defaultMinutes = 15
): CoverageGrid {
  const { start, end } = campaignWindow(startDate, endDate, tz)
  const count = Math.max(0, Math.round((end.getTime() - start.getTime()) / SLOT_MS))
  const slots = Array.from({ length: count }, () => 0)
  for (const rule of rules) {
    if (rule.paused) continue
    const minutes = rule.duration_min ?? defaultMinutes
    // Occurrences starting just before the window can still overlap it.
    const from = new Date(start.getTime() - minutes * 60_000)
    for (const at of occurrences(rule, from, end)) {
      const s = Math.max(0, Math.floor((at.getTime() - start.getTime()) / SLOT_MS))
      const e = Math.min(count, Math.ceil((at.getTime() + minutes * 60_000 - start.getTime()) / SLOT_MS))
      for (let i = s; i < e; i++) slots[i]! += 1
    }
  }
  return { start, end, slots }
}

export function coveragePercent(slots: number[]): number {
  if (slots.length === 0) return 0
  const covered = slots.filter(n => n > 0).length
  return Math.round((covered / slots.length) * 1000) / 10
}

export interface CoverageDay {
  date: string
  percent: number
  slots: number[]
}

// Coverage per calendar day in the campaign's timezone, with the per-slot
// counts the day view shows.
export function coverageByDay(grid: CoverageGrid, startDate: string, endDate: string, tz: string): CoverageDay[] {
  const days: CoverageDay[] = []
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const dayStart = zonedInstant(date, '00:00', tz)
    const dayEnd = zonedInstant(addDays(date, 1), '00:00', tz)
    const s = Math.round((dayStart.getTime() - grid.start.getTime()) / SLOT_MS)
    const e = Math.round((dayEnd.getTime() - grid.start.getTime()) / SLOT_MS)
    const slots = grid.slots.slice(Math.max(0, s), Math.max(0, e))
    days.push({ date, percent: coveragePercent(slots), slots })
  }
  return days
}
