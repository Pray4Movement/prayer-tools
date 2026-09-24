# prayer.tools v2 — plans

Rebuild of prayer.tools campaigns. Today: WordPress multisite + Disciple.Tools + the prayer campaigns plugin, one subsite per champion.

## Goals

- **No subsites.** One login; a champion manages all their campaigns from one place.
- **Custom domain per campaign** via CNAME. `{slug}.prayer.tools` by default.
- **Scale.** Target 10,000 people praying per day; design and load-test for 10×.

## Components

| Component | Where | Plan |
|---|---|---|
| Admin app | `app.prayer.tools` | [admin-app.md](admin-app.md) |
| Public server | campaign domains, `api.prayer.tools`, `go.prayer.tools` | [public-server.md](public-server.md) |
| Mobile app | iOS / Android | [mobile-app.md](mobile-app.md) |
| Hosting | DigitalOcean or Railway, behind Cloudflare | [hosting.md](hosting.md) |
| Migration | from the WordPress network | [migration.md](migration.md) |
| Campaign types | fixed, ongoing, personal start | [campaign-types.md](campaign-types.md) |

Admin app, public server, worker and a shared package (domain logic, types, email templates, i18n strings) live in one monorepo on one Postgres. The mobile app is its own codebase.

## Foundations

- **Stack:** Nuxt 4, Nuxt UI 4, Postgres via Kysely. Admin app built on Nuxtinator (`/Users/jd/code/go-saas`): core + tenancy + a `campaigns` layer.
- **Borrowed from Doxa campaigns-server** (`/Users/jd/code/doxa/campaigns-sever`) as patterns, not as a codebase: `FOR UPDATE SKIP LOCKED` reminder claim with lease, Postgres job queue, email provider layer with bounce/suppression handling, contact methods + consent, Tiptap content with AI translation, app inactivity sweep.

## Tenant model

- **Tenant = campaign**, the long-lived thing that owns the URL and domains, team, branding, email identity and subscribers.
- **Run** = a dated instance inside a campaign (Ramadan 2025, Ramadan 2026): dates, prayer fuel set, goals, commitments, stats. Relaunching is a new run on the same URL; past runs stay reachable.
- **Two RLS scopes:** campaign scope (admin) and person scope (intercessor app and manage page).

## Core data (sketch)

- `campaign`, `campaign_domain` (hostname → campaign, verification status, Cloudflare hostname id), `run`
- `person` — server-minted id, devices, optional verified email
- `contact_method` — global per address: verification, suppression, consent
- `subscription` — person × campaign; delivery `email | app`; status `active | inactive | unsubscribed`
- `commitment` — a recurring rule (or a list of specific dates for 24/7): days, time, duration, timezone, `starts_on`, `ends_on`, and `next_reminder_utc` for email delivery. **No rows for future occurrences.**
- `prayer_session` — upserted per session from pings; partitioned monthly
- `reminder_sent` — email dedupe log
- Coverage computed from the rules (see [campaign-types.md](campaign-types.md)), cached briefly
- Settings follow code-owned defaults: the DB stores only explicit overrides; defaults and labels live in code / i18n

## Background work (worker process)

- **One global reminder sweep** over a partial index on `next_reminder_utc`, claimed with `SKIP LOCKED`, sent in parallel or via provider batch APIs. Cost follows due work, never campaign count.
- **Job queue** for fan-out work (end-of-run emails, imports, exports).
- **Daily:** close ended runs; app inactivity sweep (30 days without activity per person × campaign → `inactive`, reactivated on activity; `unsubscribed` is sticky); stats refresh only for campaigns with recent activity.
- Nothing loops over every campaign. The worker reads across tenants with the admin connection and explicit campaign ids.

## Identity

- **Champions:** accounts on the admin app.
- **Web intercessors:** always email, verified by magic link.
- **App intercessors:** anonymous first (Doxa model); email linking added later.
- Anonymous commitments count toward coverage while active. Champions see counts and activity for anonymous intercessors, never individual records.

## Open questions

- A cross-campaign "all my commitments" page on prayer.tools web — deferred.
- Sending identity for campaign email — leaning: platform domain by default, optional verified custom sending domain (see [admin-app.md](admin-app.md)).
