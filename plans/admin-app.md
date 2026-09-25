# Admin app — `app.prayer.tools`

Where champions and their teams build and run campaigns. Everything a campaign shows or sends is authored here; nothing public is served from here.

## Users

- Champions and their team members
- Platform operators (cross-campaign support and oversight; curate platform libraries; approve directory listings; assign owners; read all stories; retry failed jobs)

## Stack

- Nuxtinator core + tenancy + a `campaigns` layer; the tenant is the campaign.
- Client-rendered SPA on a single origin. Never edge-cached (`Cache-Control: private, no-store` on the API).
- Owns the database migrations for the whole platform.
- Auth: Nuxtinator's current JWT auth with password and forgot password for recovery; Google and Apple sign-in may be added.
- Nuxtinator gaps to close: i18n for the admin UI, rate limiting.

## Accounts and access

- One login lists every campaign the user belongs to. No subsites, no per-campaign logins.
- Per-campaign roles and invites from Nuxtinator's tenancy layer:
  - **Owner** — team, domains, sending identity, deleting the campaign, and everything an editor can do. A campaign can have several owners.
  - **Editor** — content, email, settings, and intercessors including their details.
  - **Translator** — edits the translations of content and custom sections, for teams that want a person rather than AI to translate.
  - **Viewer** — stats only, no personal data.
- Operator access across campaigns for support. When an owner leaves, an operator can make another member an owner.

## Onboarding

Replaces today's flow (signup theme creating a subsite on another domain). Everything happens on `app.prayer.tools`, and a half-finished setup can be resumed.

1. **Account:** sign up / log in.
2. **What a campaign is:** a short explanation before any form.
3. **About the campaign:** name, description, what it's for (place, people group, event); location for the prayed-for coordinates.
4. **Template and setup:** choose a template, then answer start, end, goal and cadence, each explained (see [campaign-setup.md](campaign-setup.md)).
5. **Address and languages:** slug (`{slug}.prayer.tools`, suggested from the name). The champion chooses which languages the campaign runs in and a default language. Custom domain can be added later.
6. **Content:** choose libraries from the catalog — the template's suggested libraries first, "See more" for the rest — filtered by cadence and language, preview, and use as-is or modify; or create content from scratch (see [libraries.md](libraries.md)).
7. **Landing page:** walks through the landing-page sections (see [public-server.md](public-server.md)), asking for content where needed; stories are optional.
8. **Look and publish:** branding, email identity, a launch checklist, and a preview link that opens on desktop or phone (choosing an RTL language shows the page right to left). Campaigns stay drafts until the champion publishes.

Keeps what today's flow does behind the scenes: Turnstile and a bad-words check on names and slugs, adding the champion to the central CRM with mailing tags, and the `campaign_created` analytics event.

## What champions manage

- **Campaign:** name, slug, branding, email identity (from-name, reply-to, logo, signature). When a brand color is chosen, text on it is set to white or dark for contrast, with a warning if the color is too pale to be readable.
- **Status:** draft → published → archived (see [campaign-setup.md](campaign-setup.md)).
- **Setup:** start, end, goal, cadence, and "track time committed" for people-mobilized campaigns (see [campaign-setup.md](campaign-setup.md)).
- **Languages:** the campaign's languages and default language, changeable any time. They drive:
  - the public site's language switcher and signup language options;
  - which languages content must exist in — the library catalog shows each library's language coverage, and missing translations can be filled with AI translation;
  - reminder and campaign emails, sent in each intercessor's language.
  The list of available languages lives in code; the campaign stores only its chosen subset and default.
- **Runs:** create, schedule, relaunch (new run on the same URL), close. Past runs keep their stats.
- **End-of-run thank-you:** sent to everyone in the run when it ends, and in personal-start campaigns to each person when they reach the last day. The champion can add an optional message and call to action (button text + link) per run, with a preview.
- **Domains:** add a custom domain, see CNAME instructions and verification status (provisioned through Cloudflare for SaaS). `{slug}.prayer.tools` always works.
- **Prayer content:** libraries used directly or modified per entry, the campaign's own content, Tiptap editor, per language, AI-assisted translation (see [libraries.md](libraries.md)).
- **Libraries:** create their own, request sharing with everyone.
- **Landing page:** fill in the sections, add custom sections (heading, rich text, optional image and button), and optionally a stories section.
- **Images:** uploaded to object storage and resized for slow connections; alt text required (AI-translatable); optional credit shown under the image; a focal point so the top image crops well on phones.
- **Test emails:** "Send me a test email" on every email the campaign sends (reminder, end-of-run, check-in, verification, campaign emails), in any campaign language.
- **Translations:** per-campaign editable strings over code-owned defaults. Champion-written text (custom sections, custom consent options) is written in one language and translated into the campaign's other languages with an AI translate button; translations stay editable, and editing the original flags the other languages as out of date instead of overwriting them. No public "AI translated" label.
- **Intercessors:** email subscribers and their commitments; anonymous app intercessors appear as counts and activity only.
- **Custom signup fields:** up to about 5 (short text, dropdown or checkbox; required or optional; labels and options AI-translatable). Asked on web signup, and in the app once the person links an email. Answers show on the intercessor record and in exports and are never sent to analytics.
- **Export:** owners and editors download a CSV straight away: name, email, language, timezone, signup date, status, reminder times, custom answers, consent. Unsubscribed people appear without email or name; anonymous app intercessors aren't included. Every export is logged (who, when), visible to owners and operators.
- **Stats:** people signed up (every campaign), progress toward the goal (people, prayer time or coverage), commitments, prayer activity, praying now, people who joined through shares, per run.
- **Directory listing:** opt in; the campaign is listed after a Prayer.Tools operator approves it, and operators can unlist it. The campaign stays reachable by its link either way.
- **Communication:** campaign emails and push announcements (see Campaign email below).
- **Stories / contact messages** submitted from the public site. A story whose writer allowed the campaign to publish it can be added to the landing page's stories section in one click; the name shows only if the writer allowed it.
- **Share** (after publishing): the campaign link (the custom domain once active), a QR code (PNG and SVG), editable share messages per language with WhatsApp sharing, and a share image also used for link previews.
- **Giving:** a card on the dashboard and a line on the Share screen link to the Prayer.Tools donation page.
- **Feedback:** the feedback widget (to the Prayer.Tools board) is on every admin page.

## Campaign email

Doxa's global marketing system (composer, Tiptap templates, audiences, senders, consent tiers, one-click unsubscribe), scoped to a campaign.

- **Audiences:** current run's intercessors, past runs' intercessors (re-engagement for a relaunch), everyone who consented, everyone who ticked one of the campaign's custom consent options. Consent is per campaign, so it carries across runs.
- **Consent:** signup offers unchecked boxes for updates from this campaign and news from Prayer.Tools; reminders and transactional email come with joining. Champions can add their own consent options, with their own label. Every grant and withdrawal goes to the consent ledger (see [README.md](README.md)). Marketing only to people who opted in for that campaign. Prayer reminders are not marketing; unsubscribing from announcements never stops reminders. Bounce suppression is global per address.
- **Anonymous app intercessors** are reached by push, not email.
- **Reputation:** reminders and campaign marketing send on separate subdomains, so one campaign's bad send can't hurt reminders. Per-campaign throttling; marketing auto-pauses on high complaint rates.
- **Sending identity (leaning):** default is the platform domain with a per-campaign From name and address and the champion's reply-to. Optional verified custom sending domain: the champion adds DKIM / SPF / DMARC records and the domain is registered with the email provider through its API. Per-campaign custom SMTP is not planned (loses bounce and complaint tracking; Workspace / Microsoft 365 daily limits stall large sends). Cloudflare Email Service can't send from champions' domains (the sender domain must be a Cloudflare zone in our account).

## Settings

Campaign and run settings follow code-owned defaults: only explicit overrides are stored; defaults and labels live in code and i18n.

## Open

- Grouping campaigns for partners who run many (e.g. many Ramadan campaigns) — not needed for v1.
