// The public server's only database connection: the RLS-enforced app role.
import { createDb } from '@prayertools/shared/db/connect'
import { ensureSystemUser } from '@prayertools/shared/crm'
import type { Db } from '@prayertools/shared/db/scope'

let db: Db | null = null
let systemUserReady: Promise<void> | null = null

export function useDb(): Db {
  if (!db) {
    const url = process.env.APP_DATABASE_URL
    if (!url) throw new Error('APP_DATABASE_URL is not set')
    db = createDb(url)
  }
  return db
}

// CRM records created by public forms are attributed to the system user.
export function ensureSystemUserOnce(): Promise<void> {
  if (!systemUserReady) systemUserReady = ensureSystemUser(useDb()).catch((err) => {
    systemUserReady = null
    throw err
  })
  return systemUserReady
}
