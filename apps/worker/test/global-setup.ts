// Migrates the test database with the standalone runner before any test.
import { execFileSync } from 'node:child_process'
import * as path from 'node:path'

export default function setup(): void {
  const url = 'postgres://pt2_admin:dev@localhost:5432/prayer_tools_v3_with_orgs_2_test'
  const root = path.resolve(import.meta.dirname, '../../..')
  execFileSync('bun', ['run', path.join(root, 'scripts/migrate.ts')], { env: { ...process.env, DATABASE_URL: url }, stdio: 'inherit', cwd: root })
}
