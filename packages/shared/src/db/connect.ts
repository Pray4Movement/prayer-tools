import { Kysely } from 'kysely'
import { PostgresJSDialect } from 'kysely-postgres-js'
import postgres from 'postgres'
import type { DB } from './schema'

// Same connection posture as Nuxtinator core: `prepare: false` for PgBouncer
// transaction pooling, TLS negotiated unless the URL pins a sslmode.
export function withSslDefault(url: string): string {
  if (/[?&]sslmode=/i.test(url)) return url
  return url + (url.includes('?') ? '&' : '?') + 'sslmode=prefer'
}

export function createDb<T = DB>(url: string, opts: postgres.Options<Record<string, postgres.PostgresType>> = {}): Kysely<T> {
  const pool = postgres(withSslDefault(url), {
    prepare: false,
    onnotice: () => {},
    max: 10,
    idle_timeout: 20,
    connect_timeout: 30,
    // DATE columns stay `YYYY-MM-DD` strings; parsing them into Dates shifts
    // them by the reader's UTC offset.
    types: { date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x } },
    ...opts
  })
  return new Kysely<T>({ dialect: new PostgresJSDialect({ postgres: pool }) })
}
