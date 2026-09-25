# prayer.tools v3 — plans

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
| Campaign setup | start, end, goal, cadence, templates | [campaign-setup.md](campaign-setup.md) |
| Analytics | Statinator | [analytics.md](analytics.md) |
| Content libraries | shared and champion-made prayer content | [libraries.md](libraries.md) |
| Ideas | not planned, kept for later | [ideas.md](ideas.md) |

Admin app, public server, worker and a shared package (domain logic, types, email templates, i18n strings) live in one monorepo on one Postgres. The mobile app is its own codebase. The prayer.tools marketing site is a separate project.

## Foundations

- **Stack:** Nuxt 4, Nuxt UI 4, Postgres via Kysely. Admin app built on Nuxtinator (`/Users/jd/code/go-saas`): core + tenancy + a `campaigns` layer.
- **Open source.** Self-hosting is possible for people with hosting and development experience, but not supported.
- **Borrowed from Doxa campaigns-server** (`/Users/jd/code/doxa/campaigns-sever`) as patterns, not as a codebase: `FOR UPDATE SKIP LOCKED` reminder claim with lease, Postgres job queue, email provider layer with bounce/suppression handling, contact methods + consent, Tiptap content with AI translation, app inactivity sweep.

## Tenant model

- **Tenant = campaign**, the long-lived thing that owns the URL and domains, team, branding, email identity and subscribers.
- **Run** = a dated instance inside a campaign (Ramadan 2025, Ramadan 2026): dates, prayer content, goals, commitments, stats. Relaunching is a new run on the same URL; past runs stay reachable.
- **Two RLS scopes:** campaign scope (admin) and person scope (intercessor app and manage page).

## Core data (sketch)

- `campaign`, `campaign_domain` (hostname → campaign, verification status, Cloudflare hostname id), `run`
- `person` — server-minted id, devices, optional verified email
- `contact_method` — global per address, with a channel type (email now; phone for SMS / WhatsApp can be added): verification, suppression
- `subscription` — person × campaign; delivery `email | app` (more channels can be added); status `active | inactive | completed | unsubscribed`
- `consent` — append-only ledger: person, purpose key (built-in keys in code, or a campaign's custom option), campaign or platform, grant / withdraw, the wording shown (i18n key + version, or a copy of a custom option's label), surface, source, time. Current consent is derived from it.
- `commitment` — a recurring rule (or a list of specific dates for 24/7): days, time and timezone (always required; the time is when the reminder is sent), duration (required or optional depending on the goal, see [campaign-setup.md](campaign-setup.md)), `starts_on`, `ends_on`, and `next_reminder_utc` for email delivery. **No rows for future occurrences.**
- `prayer_session` — upserted per session from pings; partitioned monthly
- `reminder_sent` — email dedupe log
- Coverage computed from the rules (see [campaign-setup.md](campaign-setup.md)), cached briefly
- Settings follow code-owned defaults: the DB stores only explicit overrides; defaults and labels live in code / i18n

## Background work (worker process)

- **One global reminder sweep** over a partial index on `next_reminder_utc`, claimed with `SKIP LOCKED`, sent in parallel or via provider batch APIs. Cost follows due work, never campaign count. Reminder emails link to the day's prayer content; they never contain it.
- **Job queue** for fan-out work (end-of-run emails, imports, exports).
- **End of run:** when a fixed run closes, every intercessor of that run gets a thank-you — email (via the job queue) and push for app users. Default text comes from code / i18n; the champion can add a message and a call to action. Not sent to `unsubscribed` or suppressed addresses.
- **Daily:** close ended runs; mark personal-start subscriptions `completed` when the person has reached the last day (reminders stop, and they get the end-of-run thank-you); delete web signups still unverified after 7 days (the verification rate is tracked through the `campaign_signup` and `campaign_signup_verified` events, see [analytics.md](analytics.md)); app inactivity sweep (30 days without activity per person × campaign → `inactive`, reactivated on activity; `unsubscribed` is sticky); stats refresh only for campaigns with recent activity; custom-domain health check (see [public-server.md](public-server.md)); data retention (below).
- **Email check-ins (web intercessors)**, from Doxa's follow-up scheduler. Activity = prayer sessions for that campaign.
  - A check-in email is due 30 days after the last activity (or signup), then every 90 days for later cycles.
  - It asks "Are you still praying?" with three buttons: *yes* / *sometimes* complete the cycle; *no longer praying* sets `unsubscribed`.
  - Any activity since the check-in completes the cycle without a reply.
  - No reply and no activity: one reminder after a week, and a week after that the subscription is set `inactive` (reminders stop).
  - Responses are kept as history on the subscription; admins can send a check-in manually.
  - Due check-ins are found with one set-based query, not a loop over every subscription.
  - Prayer content links in reminder emails identify the person, so praying from those links counts as activity.
- Nothing loops over every campaign. The worker reads across tenants with the admin connection and explicit campaign ids.

## Data retention

- Active, inactive and completed subscriptions are kept while the campaign exists (relaunch audience; inactive people can come back).
- Unsubscribed: 12 months after unsubscribing the subscription is anonymized (name, custom answers, reminder times removed); it remains as a count in stats.
- Archived campaigns: 12 months after archiving, their intercessors' personal data is anonymized; stats remain.
- A person with no subscriptions and no app device is deleted with their email; a hashed email is kept only if the address bounced or complained, so suppression still works.
- Raw `prayer_session` rows older than 2 years are dropped by partition, once the campaign and per-person rollups hold everything shown (see [analytics.md](analytics.md)).
- Champions can't shorten these yet.

## Identity

- **Champions:** accounts on the admin app — Nuxtinator's JWT auth with password, recovered through forgot password. Google and Apple sign-in may be added.
- **Web intercessors:** email, verified by the email link, or Google / Apple sign-in (email already verified). This is separate from the subscriber magic links used to manage prayer times.
- **App intercessors:** anonymous first (Doxa model); email linking added later.
- Who counts toward the people number: see [campaign-setup.md](campaign-setup.md). Anonymous commitments count toward the campaign's goal while active. Champions see counts and activity for anonymous intercessors, never individual records.

## Open questions

- A cross-campaign "all my commitments" page on prayer.tools web — deferred.
- Sending identity for campaign email — leaning: platform domain by default, optional verified custom sending domain (see [admin-app.md](admin-app.md)).
