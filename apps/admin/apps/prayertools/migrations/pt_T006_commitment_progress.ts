// A person's progress through a personal-start campaign: how many entries
// they have opened in order, and the day they last moved forward.
import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE pt_commitment ADD COLUMN entries_done integer NOT NULL DEFAULT 0, ADD COLUMN advanced_on date`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE pt_commitment DROP COLUMN IF EXISTS entries_done, DROP COLUMN IF EXISTS advanced_on`.execute(db)
}
