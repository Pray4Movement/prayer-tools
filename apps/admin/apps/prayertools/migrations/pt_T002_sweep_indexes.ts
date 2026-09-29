// Indexes for the worker's set-based sweeps (check-ins, completion, inactivity).
import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE INDEX pt_subscription_status_activity_idx ON pt_subscription (status, delivery, last_activity_at)`.execute(db)
  await sql`CREATE INDEX pt_commitment_campaign_ends_idx ON pt_commitment (campaign_id, ends_on)`.execute(db)
  await sql`CREATE INDEX pt_prayer_session_subscription_idx ON pt_prayer_session (subscription_id, last_ping_at) WHERE subscription_id IS NOT NULL`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS pt_subscription_status_activity_idx`.execute(db)
  await sql`DROP INDEX IF EXISTS pt_commitment_campaign_ends_idx`.execute(db)
  await sql`DROP INDEX IF EXISTS pt_prayer_session_subscription_idx`.execute(db)
}
