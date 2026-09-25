# Public server — campaign domains and `api.prayer.tools`

Everything intercessors touch: campaign sites, signup, prayer fuel, subscriber self-service, and the API used by the mobile app. Server-rendered Nuxt app, separate from the admin app.

## Hosts it serves

- `{slug}.prayer.tools` for every campaign
- Champions' custom domains (CNAME → Cloudflare for SaaS fallback origin)
- `api.prayer.tools` — person-scoped JSON API for the mobile app and the manage page
- `go.prayer.tools` — short links, app deep links, QR targets

Host middleware resolves the campaign from the hostname (`campaign_domain`) and then serves the campaign's current run. `api.` and `go.` skip campaign resolution.

## Why a separate app

- Needs SSR for SEO, share previews and fast first paint on low-end phones; the admin app is an SPA.
- Serves thousands of hostnames; the admin stays on one origin so champion logins are never split across domains.
- Cache-everything at the edge vs. never-cache in admin, with simple per-host Cloudflare rules.
- Ships only what intercessors need; isolated from admin deploys and load.
- Admin endpoints don't exist on campaign domains; can use a narrower DB role.

## Pages

- Landing, signup and coverage, daily prayer fuel, stats, contact / stories — per run, per language
- Past runs reachable (e.g. `/2025/stats`)
- Subscriber manage page (see below)
- Calendar feed (webcal subscription) and one-off `.ics`
- Embeddable signup / coverage widget for external sites (replaces the WordPress shortcodes)

## Rendering and caching

- Shared pages (landing, fuel, stats) are SSR and cached at Cloudflare; the origin renders roughly once per campaign × language × page × day.
- Personal pages and their API (`/manage/*`) are `private, no-store` and bypass the cache.
- Coverage and stats come from precomputed aggregates, cached briefly at the edge.

## Signup (web)

- The signup page offers two ways in: sign up on the web, or use the app (store link / QR that deep-links into this campaign).
- Web signup uses email, verified by the email link, or Google / Apple sign-in, which gives an already-verified email. Apple's "Hide My Email" gives a relay address, so the same person typing their real email later becomes a second person.
- After signing up, the person lands on today's prayer content with a note to confirm their email. No reminders are sent until the email is verified; unverified signups are deleted after 7 days.
- Every commitment has days and a reminder time; duration depends on the campaign's goal (see [campaign-setup.md](campaign-setup.md)).
- Consent boxes, unchecked: updates from this campaign, news from Prayer.Tools, and any custom options the champion added.
- Turnstile and rate limiting on public endpoints.
- Creates or reuses the global `person` / `contact_method` by email; a subscription per campaign; commitments as recurring rules.
- Contact channels and delivery are typed so SMS or WhatsApp signup can be added later.

## Subscriber self-service (magic links)

- Links in emails point to the campaign's domain (custom domain once Cloudflare reports it active, otherwise `{slug}.prayer.tools`).
- First visit exchanges the token for an httpOnly cookie on that domain and redirects to a clean URL.
- Tokens: long random, stored hashed, scoped to one subscriber in one campaign, rotatable, optionally expiring with a "send me a fresh link" fallback. One-click unsubscribe (`List-Unsubscribe`) uses a separate narrow token.
- Manage: add / change / pause / remove prayer times, profile, language, timezone, unsubscribe, delete data.
- The manage page shows the current campaign only.
- Check-in responses: the three buttons in a check-in email (still praying / sometimes / no longer praying) land on a confirmation page on the campaign's domain, authenticated by the link token.

## API for the mobile app (`api.prayer.tools/v1`)

- Versioned and backward compatible — old app versions live for years. OpenAPI spec.
- Anonymous device registration issues a per-device credential; email linking later.
- Subscriptions and commitments per campaign; each commitment is sent as its own rule (days, time, timezone, and duration when the goal uses it).
- Prayer session pings (upsert per session) feed "praying now" and activity.
- Prayer fuel as JSON (Tiptap) by campaign / run / day / language, edge-cacheable.
- Subscription status so the app can stop reminders for ended runs or inactive subscriptions.
- Campaign directory: paginated search over campaigns that opted in and were approved by a Prayer.Tools operator.
- Report a campaign: goes to operators, who can unlist it.

## Domains and deep links

- Custom domains through Cloudflare for SaaS; provisioning is triggered from the admin app.
- Serves `apple-app-site-association` and `assetlinks.json` on `*.prayer.tools` and `go.prayer.tools`. Custom domains can't open the app (iOS needs domains at build time), so app-bound links always use prayer.tools hosts.

## i18n

- `@nuxtjs/i18n`; UI and template strings are AI-translated during development and committed with the code (25 locales today), RTL support. No Weblate and no translation screen.
- Per-campaign strings and fuel content come from the database.
- Each campaign serves only its chosen languages; the default language is used when a visitor's language isn't one of them.

## Analytics relay

Same-origin `/api/collect` and `/api/collect/heartbeat` on every campaign host (and `api.prayer.tools` for the app): record per-campaign stats, then forward to Statinator. See [analytics.md](analytics.md).

## Legacy URLs

Serves the WordPress URL shapes (manage magic links, prayer fuel links, ICS feeds) for migrated campaigns and redirects to the new pages. See [migration.md](migration.md).
