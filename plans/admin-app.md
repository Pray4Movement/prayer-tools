# Admin app — `app.prayer.tools`

Where champions and their teams build and run campaigns. Everything a campaign shows or sends is authored here; nothing public is served from here.

## Users

- Champions and their team members
- Platform operators (cross-campaign support and oversight)

## Stack

- Nuxtinator core + tenancy + a `campaigns` layer; the tenant is the campaign.
- Client-rendered SPA on a single origin. Never edge-cached (`Cache-Control: private, no-store` on the API).
- Owns the database migrations for the whole platform.
- Nuxtinator gaps to close: auth (planned Better Auth move — magic link login suits champions), i18n for the admin UI, rate limiting.

## Accounts and access

- One login lists every campaign the user belongs to. No subsites, no per-campaign logins.
- Per-campaign roles and invites from Nuxtinator's tenancy layer.
- Operator access across campaigns for support.

## What champions manage

- **Campaign:** name, slug, branding, languages, email identity (from-name, reply-to, logo, signature).
- **Runs:** create, schedule, relaunch (new run on the same URL), close. Past runs keep their stats.
- **Domains:** add a custom domain, see CNAME instructions and verification status (provisioned through Cloudflare for SaaS). `{slug}.prayer.tools` always works.
- **Prayer fuel:** Tiptap editor, day-numbered per run, per language; import content packs (e.g. Ramadan); AI-assisted translation.
- **Translations:** per-campaign editable strings over code-owned defaults.
- **Intercessors:** email subscribers and their commitments; anonymous app intercessors appear as counts and activity only.
- **Stats:** coverage, commitments, prayer activity, praying now, per run.
- **Communication:** campaign emails and push announcements (see Campaign email below).
- **Stories / contact messages** submitted from the public site.

## Campaign email

Doxa's global marketing system (composer, Tiptap templates, audiences, senders, consent tiers, one-click unsubscribe), scoped to a campaign.

- **Audiences:** current run's intercessors, past runs' intercessors (re-engagement for a relaunch), everyone who consented. Consent is per campaign, so it carries across runs.
- **Consent:** marketing only to people who opted in for that campaign. Prayer reminders are not marketing; unsubscribing from announcements never stops reminders. Bounce suppression is global per address.
- **Anonymous app intercessors** are reached by push, not email.
- **Reputation:** reminders and campaign marketing send on separate subdomains, so one campaign's bad send can't hurt reminders. Per-campaign throttling; marketing auto-pauses on high complaint rates.
- **Sending identity (leaning):** default is the platform domain with a per-campaign From name and address and the champion's reply-to. Optional verified custom sending domain: the champion adds DKIM / SPF / DMARC records and the domain is registered with the email provider through its API. Per-campaign custom SMTP is not planned (loses bounce and complaint tracking; Workspace / Microsoft 365 daily limits stall large sends). Cloudflare Email Service can't send from champions' domains (the sender domain must be a Cloudflare zone in our account).

## Settings

Campaign and run settings follow code-owned defaults: only explicit overrides are stored; defaults and labels live in code and i18n.

## Open

- Campaign type settings UI — see [campaign-types.md](campaign-types.md).
- Grouping campaigns for partners who run many (e.g. many Ramadan campaigns) — not needed for v1.
