// Logs into the admin app, visits pages, saves screenshots and reports
// console errors and failed API calls. Usage:
//   bun run scripts/admin-shots.ts /orgs /@ramadan-demo/site …
// Env: ADMIN_URL (http://localhost:2380), ADMIN_EMAIL, ADMIN_PASSWORD, SHOTS_DIR.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.env.ADMIN_URL || 'http://localhost:2380'
const dir = process.env.SHOTS_DIR || '/tmp/claude-501/pt2-shots'
mkdirSync(dir, { recursive: true })
const paths = process.argv.slice(2)

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const login = await context.request.post(`${base}/api/auth/login`, {
  data: { email: process.env.ADMIN_EMAIL || 'champion@example.com', password: process.env.ADMIN_PASSWORD || 'password123' }
})
if (!login.ok()) throw new Error(`login failed ${login.status()}`)
const page = await context.newPage()
const problems: string[] = []
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 300)}`) })
page.on('pageerror', e => problems.push(`pageerror: ${e.message.slice(0, 300)}`))
page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) problems.push(`api ${r.status()} ${r.request().method()} ${r.url().replace(base, '')}`) })

for (const p of paths) {
  problems.length = 0
  await page.goto(`${base}${p}`, { waitUntil: 'networkidle' }).catch(e => problems.push(`goto: ${e.message}`))
  await page.waitForTimeout(800)
  const file = `${dir}/${p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root'}.png`
  await page.screenshot({ path: file, fullPage: true })
  console.log(`${p} -> ${page.url().replace(base, '')} ${file}`)
  for (const pr of problems) console.log(`   ${pr}`)
}
await browser.close()
