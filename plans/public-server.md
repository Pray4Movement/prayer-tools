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

- Web always means email. New signups are verified by magic link.
- Turnstile and rate limiting on public endpoints.
- Creates or reuses the global `person` / `contact_method` by email; a subscription per campaign; commitments as recurring rules.

## Subscriber self-service (magic links)

- Links in emails point to the campaign's domain (custom domain once Cloudflare reports it active, otherwise `{slug}.prayer.tools`).
- First visit exchanges the token for an httpOnly cookie on that domain and redirects to a clean URL.
- Tokens: long random, stored hashed, scoped to one subscriber in one campaign, rotatable, optionally expiring with a "send me a fresh link" fallback. One-click unsubscribe (`List-Unsubscribe`) uses a separate narrow token.
- Manage: add / change / pause / remove prayer times, profile, language, timezone, unsubscribe, delete data.
- The manage page shows the current campaign only.

## API for the mobile app (`api.prayer.tools/v1`)

- Versioned and backward compatible — old app versions live for years. OpenAPI spec.
- Anonymous device registration issues a per-device credential; email linking later.
- Subscriptions and commitments per campaign; each commitment is sent as its own rule (days, time, duration, timezone).
- Prayer session pings (upsert per session) feed "praying now" and activity.
- Prayer fuel as JSON (Tiptap) by campaign / run / day / language, edge-cacheable.
- Subscription status so the app can stop reminders for ended runs or inactive subscriptions.
- Campaign directory: paginated search over campaigns that opt in.

## Domains and deep links

- Custom domains through Cloudflare for SaaS; provisioning is triggered from the admin app.
- Serves `apple-app-site-association` and `assetlinks.json` on `*.prayer.tools` and `go.prayer.tools`. Custom domains can't open the app (iOS needs domains at build time), so app-bound links always use prayer.tools hosts.

## i18n

- `@nuxtjs/i18n`; UI strings translated on Weblate (25 locales today), RTL support.
- Per-campaign strings and fuel content come from the database.

## Legacy URLs

Serves the WordPress URL shapes (manage magic links, prayer fuel links, ICS feeds) for migrated campaigns and redirects to the new pages. See [migration.md](migration.md).
