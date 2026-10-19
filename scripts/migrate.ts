// Standalone migration runner with the same layout and bookkeeping as
// Nuxtinator's layered runner (core `server/plugins/migrations.ts`), so a
// database can be migrated without booting the admin app. Regular migrations
// come from every layer's `migrations/` folder; tenancy retrofits
// (`*_T<NNN>_*`) are keyed with a `zzz_` prefix so they run after everything
// else. Both share the `kysely_migration` table with the admin app.
// Usage: DATABASE_URL=… bun run scripts/migrate.ts
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Migrator, sql, type Kysely, type Migration, type MigrationProvider } from 'kysely'
import { createDb } from '@prayertools/shared/db/connect'
import { LAYERS } from '../apps/admin/layers'
import { subdirOf } from '../apps/admin/scripts/lib/resolve'

const root = path.resolve(import.meta.dirname, '..')
const admin = path.join(root, 'apps/admin')

async function subdirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries.filter(e => e.isDirectory()).map(e => path.join(dir, e.name)).sort()
  } catch {
    return []
  }
}

// Nuxtinator layers load from _layers/, or from a local checkout when
// NUXTINATOR_SOURCE_DIR / NUXTINATOR_<ID>_PATH is set (as in nuxt.config.ts).
function layerDir(l: (typeof LAYERS)[number]): string {
  const envKey = l.pkg.replace(/^@/, '').replace(/[/-]/g, '_').toUpperCase() + '_PATH'
  if (process.env[envKey]) return process.env[envKey]!
  if (process.env.NUXTINATOR_SOURCE_DIR) return path.join(process.env.NUXTINATOR_SOURCE_DIR, subdirOf(l))
  return path.join(admin, '_layers', l.id)
}

export async function migrationFolders(): Promise<string[]> {
  return [
    path.join(admin, 'migrations'),
    ...LAYERS.map(l => path.join(layerDir(l), 'migrations')),
    ...(await subdirs(path.join(admin, 'apps'))).map(d => path.join(d, 'migrations'))
  ]
}

async function executedNames(db: Kysely<unknown>): Promise<string[]> {
  const table = await sql<{ present: boolean }>`select to_regclass('kysely_migration') is not null as present`.execute(db)
  if (!table.rows[0]?.present) return []
  const rows = await sql<{ name: string }>`select name from kysely_migration`.execute(db)
  return rows.rows.map(r => r.name)
}

class LayeredMigrationProvider implements MigrationProvider {
  constructor(private readonly folders: string[], private readonly executed: string[]) {}

  async getMigrations(): Promise<Record<string, Migration>> {
    const migrations: Record<string, Migration> = {}
    const collect = async (folder: string, tenancy: boolean) => {
      let entries: string[] = []
      try {
        entries = await fs.readdir(folder)
      } catch {
        return
      }
      for (const entry of entries.sort()) {
        if (!/\.(ts|js|mjs)$/.test(entry)) continue
        if (/_T\d+_/.test(entry) !== tenancy) continue
        const base = entry.replace(/\.(ts|js|mjs)$/, '')
        const name = tenancy ? `zzz_${base}` : base
        if (migrations[name]) throw new Error(`Duplicate migration name "${name}" found in multiple folders`)
        migrations[name] = await import(pathToFileURL(path.join(folder, entry)).href)
      }
    }
    for (const f of this.folders) await collect(f, false)
    for (const f of this.folders) await collect(f, true)
    // Executed migrations whose file is gone belong to a layer no longer
    // loaded; they stay recorded as no-ops so later migrations can run.
    for (const name of this.executed.filter(n => !migrations[n])) {
      migrations[name] = {
        up: async () => {},
        down: async () => {
          throw new Error(`Migration "${name}" belongs to a layer that is no longer loaded`)
        }
      }
    }
    return migrations
  }
}

export async function migrate(databaseUrl: string, log: (line: string) => void = console.log): Promise<void> {
  const db = createDb<unknown>(databaseUrl, { max: 2 })
  try {
    const migrator = new Migrator({
      db,
      provider: new LayeredMigrationProvider(await migrationFolders(), await executedNames(db)),
      allowUnorderedMigrations: true
    })
    const pending = (await migrator.getMigrations()).filter(m => !m.executedAt)
    if (pending.length === 0) {
      log('Migrations already up-to-date')
      return
    }
    log(`Running ${pending.length} pending migration(s)...`)
    const { error, results } = await migrator.migrateToLatest()
    for (const r of results ?? []) log(`${r.status === 'Success' ? '✓' : '✗'} ${r.migrationName}`)
    if (error) throw error
    log('Migrations complete')
  } finally {
    await db.destroy()
  }
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }
  await migrate(url)
}
