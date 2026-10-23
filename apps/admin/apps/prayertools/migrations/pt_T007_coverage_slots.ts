// 24/7 coverage campaigns choose their slot length (NULL is the code default,
// 15 minutes) and need a start and an end date, so open-ended coverage
// campaigns become prayer-time campaigns aiming for 24 hours a day.
import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE pt_campaign ADD COLUMN slot_min smallint CHECK (slot_min IN (5, 10, 15, 30, 60))`.execute(db)
  await sql`UPDATE pt_campaign SET goal = 'prayer_time' WHERE goal = 'coverage' AND (start_mode <> 'date' OR end_mode <> 'date')`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE pt_campaign DROP COLUMN IF EXISTS slot_min`.execute(db)
}
