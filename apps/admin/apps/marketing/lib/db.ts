import { sql } from 'kysely'
import type { MarketingDb, MarketingTx } from './types'

// Runs `fn` inside the org's RLS scope (the same GUC the tenancy layer sets).
export async function inOrg<T>(db: MarketingDb, orgId: string, fn: (tx: MarketingTx) => Promise<T>): Promise<T> {
  return await db.transaction().execute(async (tx) => {
    await sql`select set_config('app.current_org', ${orgId}, true)`.execute(tx)
    return await fn(tx)
  })
}

export function jsonb<T>(value: T) {
  return sql<T>`${JSON.stringify(value)}::text::jsonb`
}

export function textArray(values: readonly string[]) {
  const literal = `{${values.map(v => `"${v.replace(/(["\\])/g, '\\$1')}"`).join(',')}}`
  return sql<string[]>`${literal}::text[]`
}

export function uuidArray(values: readonly string[]) {
  return sql<string[]>`${`{${values.join(',')}}`}::uuid[]`
}
