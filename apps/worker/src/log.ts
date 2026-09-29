// JSON logs, one object per line; `child` adds fields (run, job, site) to every line.
// `alert` marks conditions an operator must act on.
import { randomBytes } from 'node:crypto'

export type Level = 'debug' | 'info' | 'warn' | 'error' | 'alert'
export type Fields = Record<string, unknown>

export interface Logger {
  debug(msg: string, fields?: Fields): void
  info(msg: string, fields?: Fields): void
  warn(msg: string, fields?: Fields): void
  error(msg: string, fields?: Fields): void
  alert(msg: string, fields?: Fields): void
  child(fields: Fields): Logger
}

export type Sink = (line: Fields) => void

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40, alert: 50 }

export function runId(): string {
  return randomBytes(5).toString('hex')
}

function serialize(fields: Fields): Fields {
  const out: Fields = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v instanceof Error) out[k] = { message: v.message, name: v.name, stack: v.stack?.split('\n').slice(0, 6).join('\n') }
    else if (v !== undefined) out[k] = v
  }
  return out
}

export function createLogger(base: Fields = {}, sink: Sink = line => console.log(JSON.stringify(line)), minLevel: Level = (process.env.LOG_LEVEL as Level) || 'info'): Logger {
  const write = (level: Level, msg: string, fields?: Fields) => {
    if (ORDER[level] < (ORDER[minLevel] ?? 20)) return
    sink({ ts: new Date().toISOString(), level, msg, ...serialize(base), ...serialize(fields ?? {}) })
  }
  return {
    debug: (m, f) => write('debug', m, f),
    info: (m, f) => write('info', m, f),
    warn: (m, f) => write('warn', m, f),
    error: (m, f) => write('error', m, f),
    alert: (m, f) => write('alert', m, f),
    child: fields => createLogger({ ...base, ...fields }, sink, minLevel)
  }
}
