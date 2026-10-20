// The database the test suites migrate and run against, named by PT_TEST_DB
// (process env, else the repo-root .env; see .env.example), on the roles
// scripts/db-setup.ts creates.
import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'

function rootEnv(key: string): string | undefined {
  if (process.env[key]) return process.env[key]
  const file = path.resolve(import.meta.dirname, '../.env')
  if (!existsSync(file)) return undefined
  const line = readFileSync(file, 'utf8').split('\n').find(l => l.startsWith(`${key}=`))
  return line?.slice(key.length + 1).trim() || undefined
}

export function testDb(): { name: string, adminUrl: string, appUrl: string } {
  const name = rootEnv('PT_TEST_DB')
  if (!name) throw new Error('PT_TEST_DB is not set. Add it to the repo-root .env (see .env.example) and create the database with `bun run scripts/db-setup.ts <name>`.')
  const prefix = process.env.PT_DB_ROLE_PREFIX || 'pt2'
  const password = process.env.PT_DB_PASSWORD || 'dev'
  return {
    name,
    adminUrl: `postgres://${prefix}_admin:${password}@localhost:5432/${name}`,
    appUrl: `postgres://${prefix}_app:${password}@localhost:5432/${name}`
  }
}

// The migration runner's layer source for the test database, so tests migrate
// with the same Nuxtinator layers the admin app loads: NUXTINATOR_SOURCE_DIR
// and NUXTINATOR_<ID>_PATH from the process, the repo-root .env or the admin
// app's .env, in that order.
export function testMigrationEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const file of [path.resolve(import.meta.dirname, '../apps/admin/.env'), path.resolve(import.meta.dirname, '../.env')]) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^(NUXTINATOR_SOURCE_DIR|NUXTINATOR_[A-Z_]+_PATH)=(.+)$/)
      if (m) out[m[1]!] = m[2]!.trim()
    }
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v && /^(NUXTINATOR_SOURCE_DIR|NUXTINATOR_[A-Z_]+_PATH)$/.test(k)) out[k] = v
  }
  return out
}
