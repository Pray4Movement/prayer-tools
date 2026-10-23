import { chromium } from 'playwright'
const email = `welcome-${Date.now()}@example.com`
const out = process.argv[2]
const mp = 'http://localhost:8025/api/v1'
async function waitMail(subjectPart) {
  for (let i = 0; i < 40; i++) {
    const r = await (await fetch(`${mp}/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json()
    const m = r.messages?.find(x => x.Subject.includes(subjectPart))
    if (m) return await (await fetch(`${mp}/message/${m.ID}`)).json()
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`no mail ${subjectPart}`)
}
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
await page.goto('http://ramadan-demo.localhost:3631/')
await page.waitForTimeout(3000)
await page.getByText('Sign up to pray').first().click()
await page.waitForTimeout(1500)
const emailInput = page.locator('input[type=email]').first()
await emailInput.scrollIntoViewIfNeeded()
await emailInput.fill(email)
await page.locator('input[autocomplete=given-name]').fill('Sam')
await page.screenshot({ path: `${out}/0-form.png`, fullPage: true })
await page.locator('form button[type=submit]').click()
await page.waitForTimeout(2500)
await page.screenshot({ path: `${out}/1-signed-up.png` })
const verify = await waitMail('Confirm')
const link = verify.HTML.match(/href="([^"]*\/verify\/[^"]+)"/)[1]
await page.goto(link)
await page.waitForTimeout(1500)
await page.screenshot({ path: `${out}/2-verified.png` })
const welcome = await waitMail('Welcome')
console.log('subject:', welcome.Subject)
console.log('headers List-Unsubscribe:', JSON.stringify((await (await fetch(`${mp}/message/${welcome.ID}/headers`)).json())['List-Unsubscribe']))
console.log(welcome.Text)
const mailPage = await browser.newPage({ viewport: { width: 700, height: 900 } })
await mailPage.setContent(welcome.HTML)
await mailPage.screenshot({ path: `${out}/3-welcome-email.png`, fullPage: true })
// The verify link only welcomes once.
await page.goto(link)
await page.waitForTimeout(1500)
const r = await (await fetch(`${mp}/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json()
console.log('welcome count:', r.messages.filter(x => x.Subject.includes('Welcome')).length)
await browser.close()
