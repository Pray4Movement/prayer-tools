// Migrates the test database with the standalone runner before any test.
import { execFileSync } from 'node:child_process'
import * as path from 'node:path'
import { testDb, testMigrationEnv } from '../../../scripts/test-db'

export default function setup(): void {
  const url = testDb().adminUrl
  const root = path.resolve(import.meta.dirname, '../../..')
  execFileSync('bun', ['run', path.join(root, 'scripts/migrate.ts')], { env: { ...process.env, ...testMigrationEnv(), DATABASE_URL: url }, stdio: 'inherit', cwd: root })
}
