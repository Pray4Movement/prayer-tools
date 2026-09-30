// End-to-end checks of the admin API against a running dev server: site
// creation, campaigns, content copy-on-edit, roles and cross-site isolation.
// Usage: node apps/admin/scripts/smoke.ts   (needs the admin app on :2380)
import postgres from 'postgres'

const base = process.env.ADMIN_URL || 'http://localhost:2380'
const sql = postgres(process.env.DATABASE_URL || 'postgres://pt2_admin:dev@localhost:5432/prayer_tools_v3_with_orgs_2', { onnotice: () => {} })
const run = Date.now().toString(36)
let failures = 0

function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || detail === undefined ? '' : ` — ${JSON.stringify(detail).slice(0, 300)}`}`)
  if (!ok) failures++
}

async function user(email: string, name: string): Promise<string> {
  await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'password123', display_name: name }) })
  await sql`update users set verified = true where email = ${email}`
  const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'password123' }) })
  const cookie = res.headers.getSetCookie().find(c => c.startsWith('auth-token='))
  if (!cookie) throw new Error(`login failed for ${email}`)
  return cookie.split(';')[0]!
}

async function api(cookie: string, method: string, path: string, body?: unknown, org?: string) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { cookie, 'content-type': 'application/json', ...(org ? { 'x-active-org': org } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, json }
}

const owner = await user(`owner-${run}@example.com`, 'Owner Smoke')
const other = await user(`other-${run}@example.com`, 'Other Smoke')

const slugA = `smoke-a-${run}`
const slugB = `smoke-b-${run}`
const a = await api(owner, 'POST', '/api/pt/sites', { name: 'Smoke A', slug: slugA, languages: ['en', 'fr'], default_language: 'en', timezone: 'Europe/Paris' })
check('owner creates site A', a.status === 200, a.json)
const b = await api(other, 'POST', '/api/pt/sites', { name: 'Smoke B', slug: slugB, timezone: 'UTC' })
check('other user creates site B', b.status === 200, b.json)
check('reserved slug refused', (await api(owner, 'POST', '/api/pt/sites', { name: 'Api', slug: 'api' })).status === 400)
check('duplicate slug refused', (await api(owner, 'POST', '/api/pt/sites', { name: 'Dup', slug: slugA })).status === 409)

const camp = await api(owner, 'POST', '/api/pt/campaigns', { name: 'Ramadan 2027', template_key: 'ramadan', start_date: '2027-02-08' }, slugA)
check('Ramadan template fills a 30-day end date', camp.json?.campaign?.end_date === '2027-03-09', camp.json)
const overlap = await api(owner, 'POST', '/api/pt/campaigns', { name: 'Overlap', start_date: '2027-02-20', end_date: '2027-03-01' }, slugA)
check('overlapping campaign refused', overlap.status === 400, overlap.json)

check('site B is invisible to the owner of A', (await api(owner, 'GET', '/api/pt/site', undefined, slugB)).status === 404)
check('site B campaigns invisible to A', (await api(owner, 'GET', '/api/pt/campaigns', undefined, slugB)).status === 404)

const libs = await api(owner, 'GET', '/api/pt/libraries?template=ramadan')
const libId = libs.json?.libraries?.[0]?.id
check('catalog lists a library', !!libId, libs.json)
const campaignId = camp.json?.campaign?.id
const added = await api(owner, 'POST', '/api/pt/content/libraries', { campaignId, libraryId: libId }, slugA)
check('library added to campaign', !!added.json?.siteLibraryId, added.json)
const sl = added.json?.siteLibraryId
const before = await api(owner, 'GET', `/api/pt/content?campaign=${campaignId}`, undefined, slugA)
check('library followed before any edit', before.json?.libraries?.[0]?.follows === true, before.json)
const edit = await api(owner, 'PUT', '/api/pt/content/entry', { siteLibraryId: sl, day: 1, lang: 'en', doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edited' }] }] } }, slugA)
check('entry edit saved', edit.status === 200, edit.json)
const after = await api(owner, 'GET', `/api/pt/content?campaign=${campaignId}`, undefined, slugA)
check('first edit freezes a site copy', after.json?.libraries?.[0]?.follows === false && after.json?.libraries?.[0]?.frozenVersion === 1, after.json)
const fr = await api(owner, 'GET', `/api/pt/content/entry?siteLibrary=${sl}&day=1&lang=fr`, undefined, slugA)
check('other languages marked out of date', fr.json?.stale === true, fr.json)

// Roles: invite the other user to site A as a viewer.
const inv = await api(owner, 'POST', `/api/o/${slugA}/invite`, { email: `other-${run}@example.com`, roles: ['pt-viewer'] }, slugA)
check('viewer added to site A', inv.status === 200, inv.json)
check('viewer can read stats', (await api(other, 'GET', '/api/pt/stats', undefined, slugA)).status === 200)
check('viewer cannot read an intercessor', (await api(other, 'GET', '/api/pt/contacts/00000000-0000-4000-8000-000000000000/subscription', undefined, slugA)).status === 403)
check('viewer cannot edit the site', (await api(other, 'PATCH', '/api/pt/site', { name: 'Hacked' }, slugA)).status === 403)
const promote = await api(owner, 'PATCH', `/api/o/${slugA}/members/${(await sql`select id from users where email = ${`other-${run}@example.com`}`)[0]!.id}/roles`, { roles: ['pt-translator'] }, slugA)
check('owner changes viewer to translator', promote.status === 200, promote.json)
check('translator cannot edit the default language', (await api(other, 'PUT', '/api/pt/content/entry', { siteLibraryId: sl, day: 2, lang: 'en', doc: { type: 'doc', content: [] } }, slugA)).status === 403)
check('translator can edit French', (await api(other, 'PUT', '/api/pt/content/entry', { siteLibraryId: sl, day: 2, lang: 'fr', doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bonjour' }] }] } }, slugA)).status === 200)
const ownerId = (await sql`select id from users where email = ${`owner-${run}@example.com`}`)[0]!.id
check('last owner cannot leave', (await api(owner, 'DELETE', `/api/o/${slugA}/members/${ownerId}`, undefined, slugA)).status === 409)

const field = await api(owner, 'POST', '/api/pt/signup-fields', { kind: 'text', label: { source: 'en', values: { en: 'Your church' } } }, slugA)
check('signup question created with CRM field', field.status === 200 && (await sql`select 1 from crm_record_fields where field_key = 'pt_your_church' and org_id = ${a.json.id}`).length === 1, field.json)

const exported = await fetch(`${base}/api/pt/export.csv`, { headers: { cookie: owner, 'x-active-org': slugA } })
check('export CSV downloads and is logged', exported.ok && (await sql`select 1 from pt_export_log where org_id = ${a.json.id}`).length === 1)

const del = await api(owner, 'DELETE', '/api/pt/site', { confirm: slugA }, slugA)
check('owner deletes site A', del.status === 200, del.json)
await api(other, 'DELETE', '/api/pt/site', { confirm: slugB }, slugB)
await sql`delete from users where email in (${`owner-${run}@example.com`}, ${`other-${run}@example.com`})`
await sql.end()
console.log(failures ? `${failures} failure(s)` : 'all passed')
process.exit(failures ? 1 : 0)
