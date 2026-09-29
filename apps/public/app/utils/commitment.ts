export interface CommitmentInput {
  frequency: 'daily' | 'weekly'
  days_of_week: number[]
  time: string
  duration_min: number | null
}

export function newCommitment(rule: 'required' | 'optional' | 'hidden', defaultDuration: number, cadence: 'daily' | 'weekly' = 'daily'): CommitmentInput {
  return {
    frequency: cadence,
    days_of_week: cadence === 'weekly' ? [new Date().getDay()] : [],
    time: '07:00',
    duration_min: rule === 'hidden' ? null : defaultDuration
  }
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function timezones(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone')
    if (list?.length) return list.includes('UTC') ? list : ['UTC', ...list]
  } catch {
    // older engines
  }
  return ['UTC']
}

// "Daily at 07:00" style summary of a rule.
export function describeRule(c: { kind?: string, frequency: string | null, daysOfWeek?: number[], days_of_week?: number[], time: string, dates?: string[] }, lang: string, t: (k: string, p?: Record<string, unknown>) => string): string {
  const time = formatTime(c.time, lang)
  if (c.kind === 'dates') return t('commitment.dates_summary', { n: c.dates?.length ?? 0 })
  if (c.frequency === 'daily') return t('commitment.daily_at', { time })
  const days = (c.daysOfWeek ?? c.days_of_week ?? []).slice().sort()
  const fmt = new Intl.DateTimeFormat(lang, { weekday: 'long', timeZone: 'UTC' })
  const names = days.map(d => fmt.format(new Date(Date.UTC(2024, 0, 7 + d))))
  let list = names.join(', ')
  try {
    list = new Intl.ListFormat(lang, { type: 'conjunction' }).format(names)
  } catch {
    // ListFormat unavailable
  }
  return t('commitment.weekly_at', { days: list, time })
}

export function formatTime(hhmm: string, lang: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  try {
    return new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1, h, m)))
  } catch {
    return hhmm
  }
}

export function formatMinutes(n: number, lang: string): string {
  try {
    return new Intl.NumberFormat(lang, { style: 'unit', unit: 'minute', unitDisplay: 'long' }).format(n)
  } catch {
    return `${n} min`
  }
}
