// iCalendar (RFC 5545) output. Every event is written in UTC, so calendar
// clients never need our timezone definitions.
export interface IcsEvent {
  uid: string
  start: Date
  minutes: number
  summary: string
  description?: string
  url?: string
}

export function icsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

export function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// Lines longer than 75 octets continue on the next line after a space.
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let current = ''
  let size = 0
  for (const ch of line) {
    const n = Buffer.byteLength(ch, 'utf8')
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += ch
    size += n
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function buildCalendar(name: string, events: IcsEvent[], now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Prayer.Tools//Prayer times//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText(name)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H'
  ]
  for (const e of events) {
    const end = new Date(e.start.getTime() + e.minutes * 60_000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsText(e.summary)}`
    )
    if (e.description) lines.push(`DESCRIPTION:${icsText(e.description)}`)
    if (e.url) lines.push(`URL:${e.url}`)
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(e.summary)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return `${lines.map(foldLine).join('\r\n')}\r\n`
}
