import { describe, expect, test } from 'bun:test'
import { buildCalendar, foldLine, icsDate, icsText } from '../server/lib/ics'

describe('ics', () => {
  test('escapes text per RFC 5545', () => {
    expect(icsText('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne')
  })

  test('formats instants in UTC', () => {
    expect(icsDate(new Date('2026-10-01T03:04:05.678Z'))).toBe('20261001T030405Z')
  })

  test('folds long lines at 75 octets without splitting characters', () => {
    const line = `SUMMARY:${'é'.repeat(60)}`
    const folded = foldLine(line)
    for (const part of folded.split('\r\n')) expect(Buffer.byteLength(part, 'utf8')).toBeLessThanOrEqual(75)
    expect(folded.split('\r\n').map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(line)
  })

  test('builds a calendar with one event per occurrence and CRLF endings', () => {
    const cal = buildCalendar('Pray, for Beirut', [
      { uid: 'x@prayer.tools', start: new Date('2026-10-01T00:00:00Z'), minutes: 15, summary: 'Pray', url: 'https://a.test/pray/1' }
    ], new Date('2026-09-01T00:00:00Z'))
    expect(cal.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(cal).toContain('X-WR-CALNAME:Pray\\, for Beirut')
    expect(cal).toContain('DTSTART:20261001T000000Z\r\nDTEND:20261001T001500Z')
    expect(cal.match(/BEGIN:VEVENT/g)?.length).toBe(1)
    expect(cal.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
})
