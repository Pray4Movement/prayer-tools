// A personal-start campaign without a length runs for as many entries as its
// content has.
import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE pt_campaign DROP CONSTRAINT IF EXISTS pt_campaign_check2`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE pt_campaign ADD CONSTRAINT pt_campaign_check2 CHECK (end_mode <> 'days' OR length_days IS NOT NULL)`.execute(db)
}
