// Templates and multi-site sends belong to a user, not a site. Their handlers
// run in a personal app, which sets `app.current_user`; rows are visible only
// to their owner. The worker reads multi-site sends on its BYPASSRLS role.
import { type Kysely, sql } from 'kysely'

const TABLES = ['marketing_template', 'marketing_parent']

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const table of TABLES) {
    await sql`ALTER TABLE ${sql.ref(table)} ENABLE ROW LEVEL SECURITY`.execute(db)
    await sql`
      CREATE POLICY user_isolation ON ${sql.ref(table)} FOR ALL
        USING       (owner_user_id = nullif(current_setting('app.current_user', true), '')::uuid)
        WITH CHECK  (owner_user_id = nullif(current_setting('app.current_user', true), '')::uuid)
    `.execute(db)
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const table of TABLES) {
    await sql`DROP POLICY IF EXISTS user_isolation ON ${sql.ref(table)}`.execute(db)
    await sql`ALTER TABLE ${sql.ref(table)} DISABLE ROW LEVEL SECURITY`.execute(db)
  }
}
