// Global suppression, per address across every site: a hard bounce or a
// complaint learned on one site protects all of them. Stored as a hash so a
// suppressed address outlives the deletion of the person's data.
import type { Db, Tx } from '../db/scope'
import { emailHash } from '../tokens'

export async function isSuppressed(db: Db | Tx, email: string): Promise<boolean> {
  const row = await db.selectFrom('pt_suppression').select('id').where('address_hash', '=', emailHash(email)).executeTakeFirst()
  return !!row
}

export async function suppressedAmong(db: Db | Tx, emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set()
  const byHash = new Map(emails.map(e => [emailHash(e), e.trim().toLowerCase()]))
  const rows = await db.selectFrom('pt_suppression').select('address_hash').where('address_hash', 'in', [...byHash.keys()]).execute()
  return new Set(rows.map(r => byHash.get(r.address_hash)!).filter(Boolean))
}

export async function suppress(db: Db | Tx, email: string, reason: 'hard_bounce' | 'complaint', detail: string | null, source: string): Promise<void> {
  await db
    .insertInto('pt_suppression')
    .values({ address_hash: emailHash(email), reason, detail: detail?.slice(0, 500) ?? null, source })
    .onConflict(oc => oc.column('address_hash').doNothing())
    .execute()
}
