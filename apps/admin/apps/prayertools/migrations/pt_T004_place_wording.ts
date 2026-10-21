// A site's place name and its "in"/"of" phrases per language, as typed by a
// champion. Fallbacks for anything missing live in code.
import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE pt_site ADD COLUMN place_wording jsonb NOT NULL DEFAULT '{}'::jsonb`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE pt_site DROP COLUMN IF EXISTS place_wording`.execute(db)
}
