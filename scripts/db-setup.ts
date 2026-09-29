// Creates the two database roles and the database for local development:
//   <prefix>_admin — BYPASSRLS, owns the schema; migrations and worker sweeps
//   <prefix>_app   — RLS-enforced; admin requests and the public server
// Usage: bun run scripts/db-setup.ts [dbname]
// Env: PG_SUPERUSER_URL (default postgres://localhost:5432/postgres),
//      PT_DB_ROLE_PREFIX (default pt2), PT_DB_PASSWORD (default "dev")
import postgres from 'postgres'

const superUrl = process.env.PG_SUPERUSER_URL || 'postgres://localhost:5432/postgres'
const prefix = process.env.PT_DB_ROLE_PREFIX || 'pt2'
const password = process.env.PT_DB_PASSWORD || 'dev'
const dbName = process.argv[2] || 'prayer_tools_v3_with_orgs_2'
const admin = `${prefix}_admin`
const app = `${prefix}_app`

const su = postgres(superUrl, { onnotice: () => {} })

async function ensureRole(name: string, bypass: boolean) {
  const [exists] = await su`select 1 from pg_roles where rolname = ${name}`
  if (!exists) {
    await su.unsafe(`CREATE ROLE ${name} LOGIN PASSWORD '${password}' ${bypass ? 'BYPASSRLS' : 'NOBYPASSRLS'}`)
    console.log(`created role ${name}`)
  }
}

await ensureRole(admin, true)
await ensureRole(app, false)

const [db] = await su`select 1 from pg_database where datname = ${dbName}`
if (!db) {
  await su.unsafe(`CREATE DATABASE ${dbName} OWNER ${admin}`)
  console.log(`created database ${dbName}`)
}
await su.unsafe(`REVOKE CONNECT ON DATABASE ${dbName} FROM PUBLIC`)
await su.unsafe(`GRANT CONNECT ON DATABASE ${dbName} TO ${admin}, ${app}`)
await su.end()

const inDb = postgres(superUrl.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`), { onnotice: () => {} })
await inDb.unsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`)
await inDb.unsafe(`ALTER SCHEMA public OWNER TO ${admin}`)
await inDb.unsafe(`GRANT USAGE ON SCHEMA public TO ${app}`)
await inDb.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${app}`)
await inDb.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${app}`)
await inDb.unsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE ${admin} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${app}`)
await inDb.unsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE ${admin} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${app}`)
await inDb.unsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE ${admin} IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO ${app}`)
await inDb.end()

console.log(`DATABASE_URL=postgres://${admin}:${password}@localhost:5432/${dbName}`)
console.log(`APP_DATABASE_URL=postgres://${app}:${password}@localhost:5432/${dbName}`)
