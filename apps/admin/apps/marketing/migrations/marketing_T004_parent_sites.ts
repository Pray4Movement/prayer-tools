// Each site's email of a multi-site send carries the send's chosen sites, so
// unsubscribing can withdraw consent on all of them from inside one site.
import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE marketing_email ADD COLUMN parent_org_ids uuid[] NOT NULL DEFAULT '{}'`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE marketing_email DROP COLUMN parent_org_ids`.execute(db)
}
