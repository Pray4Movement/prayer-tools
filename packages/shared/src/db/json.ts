import { sql, type RawBuilder } from 'kysely'

// jsonb parameter. The `::text` stop keeps the driver from JSON-encoding the
// already-stringified value a second time (which would store a jsonb string).
export function jsonb<T>(value: T): RawBuilder<T> {
  return sql<T>`${JSON.stringify(value)}::text::jsonb`
}

// Postgres array literal for text[] / smallint[] columns.
export function pgArray<T extends string | number>(values: readonly T[], type: 'text' | 'smallint' | 'integer' | 'uuid' | 'timestamptz' = 'text'): RawBuilder<T[]> {
  const literal = `{${values.map(v => typeof v === 'number' ? String(v) : `"${String(v).replace(/(["\\])/g, '\\$1')}"`).join(',')}}`
  return sql<T[]>`${literal}::${sql.raw(type)}[]`
}
