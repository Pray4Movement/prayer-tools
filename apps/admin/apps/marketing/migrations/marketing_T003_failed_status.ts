// A site email the worker refuses to send ends as 'failed', with the reason.
import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE marketing_email DROP CONSTRAINT marketing_email_status_check`.execute(db)
  await sql`ALTER TABLE marketing_email ADD CONSTRAINT marketing_email_status_check CHECK (status IN ('draft', 'scheduled', 'sending', 'paused', 'sent', 'cancelled', 'failed'))`.execute(db)
  await sql`ALTER TABLE marketing_email ADD COLUMN failed_reason text`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE marketing_email DROP COLUMN failed_reason`.execute(db)
  await sql`ALTER TABLE marketing_email DROP CONSTRAINT marketing_email_status_check`.execute(db)
  await sql`ALTER TABLE marketing_email ADD CONSTRAINT marketing_email_status_check CHECK (status IN ('draft', 'scheduled', 'sending', 'paused', 'sent', 'cancelled'))`.execute(db)
}
