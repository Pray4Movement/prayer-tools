// A site always keeps an owner: the last owner can't leave, be removed or be
// demoted through the tenancy team endpoints.
import { sql } from 'kysely'
import { db } from '#core/server/utils/database'

const MEMBER_PATH = /^\/api\/o\/[^/]+\/members\/([0-9a-f-]{36})(\/roles)?\/?$/

export default defineEventHandler(async (event) => {
  const match = event.path.split('?')[0]!.match(MEMBER_PATH)
  if (!match) return
  const isRoles = !!match[2] && event.method === 'PATCH'
  const isRemove = !match[2] && event.method === 'DELETE'
  if (!isRoles && !isRemove) return
  const orgId = event.context.orgId as string | undefined
  if (!orgId) return
  const userId = match[1]!
  if (isRoles) {
    const body = await readBody(event).catch(() => null) as { roles?: string[] } | null
    if (Array.isArray(body?.roles) && body.roles.includes('admin')) return
  }
  const owners = await db.selectFrom('memberships').select('user_id').where('org_id', '=', orgId).where(sql<boolean>`roles @> ARRAY['admin']::text[]`).execute()
  if (owners.length === 1 && owners[0]!.user_id === userId) {
    throw createError({ statusCode: 409, statusMessage: 'A site needs at least one owner. Make someone else an owner first.' })
  }
})
