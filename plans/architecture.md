# Architecture — with orgs

Each site is a Nuxtinator org. The admin app is built from shared Nuxtinator layers, and prayer.tools' own features live in a prayer.tools layer. Per-site isolation comes from Nuxtinator's tenancy, the same way for every layer.

The alternative (Nuxtinator single-tenant, sites and teams built in prayer.tools, copied code instead of shared layers) is on the `no-orgs` branch.

## Why this shape

- **Shared improvements.** Email sending, deliverability, the contact and inbox UI are built once as Nuxtinator layers; other projects get prayer.tools' improvements, and prayer.tools gets theirs.
- **Simple isolation.** Layers never know about sites. They scope everything to "the current org", and tenancy makes the org the site. prayer.tools' own tables follow the same pattern, so there is one rule everywhere.
- **Cost:** a request sees one org. Anything spanning several of a champion's sites is built as the exceptions below.

## Admin app layers

| Layer | Source | Role in prayer.tools |
|---|---|---|
| core | Nuxtinator | Accounts, auth, admin shell, operator admin, rate limiting, storage, activity log |
| tenancy | Nuxtinator | Orgs = sites, memberships = site teams, invites, per-org RLS |
| email provider | Nuxtinator, upgraded | One transport for every mail: reply-to, threading, attachments, `List-Unsubscribe`; separate sending domains for reminders / transactional and for marketing; bounce and complaint webhooks → global suppression |
| CRM | Nuxtinator, upgraded | Each site's contacts, consent and consent proof log |
| inbox | Nuxtinator | Each site's contact messages and stories as threads; replies by email |
| marketing | New Nuxtinator layer, ported from Doxa | Each site's campaign email, built on the CRM |
| ai | Nuxtinator | AI translation and AI-drafted inbox replies |
| prayer.tools | This repo | Sites, domains, campaigns, setup, content, libraries, landing page, intercessors, commitments, stats |

The public server and worker are not Nuxt layers. Logic they share with the admin app (reminder sending, audiences, rendering) lives in the shared package or in the layers' plain TypeScript modules that the worker imports.

## Tenancy

- **Org = site.** The org slug is the site slug (`{slug}.prayer.tools`); reserved names (`app`, `api`, `go`, `www`, …) are refused. Custom domains live in `site_domain`, keyed by org.
- **Staff org** for the prayer.tools team: the platform CRM (champions, "news from Prayer.Tools" consent), platform inbox, platform email.
- **Roles:** owner, editor, translator, viewer as fixed tenancy roles (see [admin-app.md](admin-app.md)). Tenancy's custom roles and per-org role overrides are hidden.
- **Apps:** every layer is on for every site; per-org app switching is not used.
- **Invites and team screens** come from tenancy.
- **Operators** (prayer.tools staff) reach any site through Nuxtinator's operator path.

## Isolation

- Every per-site table has the org and RLS, whether it belongs to a layer (CRM, inbox, marketing) or to prayer.tools (campaigns, subscriptions, commitments, stories, stats).
- **Admin app:** each request runs inside the site's org; the tenancy wrappers set it and check the member's permission.
- **Public server:** resolves the site from the hostname and runs inside that site's org, or as the person (person scope) for the app API and the My prayer page. It uses the RLS-enforced role, never the bypass role.
- **Worker:** set-based sweeps read across sites with the admin connection and explicit site ids; work that writes a site's data runs inside that site's org, through one shared "for each org" helper.
- **Global tables** (no org): `intercessor`, app devices, global suppression, libraries, the personal library, job queue, reports. Always filtered explicitly.

## Intercessor data

- **Contact per site.** Each intercessor who signs up on a site gets a CRM contact in that site's org: name, email, language, custom answers, consent. What someone told site A is never visible to site B.
- **`intercessor`, global and thin:** id, verified email, app devices. A site's contact links to it once the email is verified. It serves the app, the My prayer page and platform-wide counts.
- **Anonymous app intercessors** are not CRM contacts (champions never see them individually). Their subscriptions and commitments point at the `intercessor`. Linking an email and joining a site's signup fields creates their contact on that site.
- **Suppression** is global per address, so a bounce learned on one site protects every site.

## Working across sites

A request sees one org, so these are built as exceptions.

- **Your sites.** After login, the sites list comes from the user's memberships: name, live address, role, status, current campaign and people count, with pending invites at the top. Operators can search all sites.
- **Personal library.** Email templates, images and reusable blocks belong to the champion, not to a site, and can be used on any of their sites. Using one on a site makes a copy there. These are tables owned by the user, outside org scoping; they hold no intercessor data. Prayer-content libraries follow the same ownership (see [libraries.md](libraries.md)). Sharing with specific people is deferred.
- **Multi-site sends.** The composer lists every site where the champion may send. They write once and pick sites and audiences; the send becomes one send per site, each inside its own org with that site's sender, branding, consent and unsubscribe link. A parent record owned by the champion ties them together and shows combined results.
  - **One email per person.** A person on several of the chosen sites gets one email, from the most recently joined of those sites where they consented to updates. The parent record keeps only a fingerprint of each address to deduplicate.
  - **Unsubscribe** from that email withdraws updates consent on every chosen site the person belongs to; the consent log records one withdrawal per site.
  - Variables (`{site name}`, `{campaign name}`, `{past campaign}`, `{site link}`, `{first name}`) are filled in per site at send time.
- **Reading across orgs** (a combined "all my people" list or dashboard) would need tenancy to let a request see several orgs: [nuxtinator#17](https://github.com/corsacca/nuxtinator/issues/17). Not needed for v1.

## Nuxtinator upgrades this needs

- **CRM:** a system actor for records created without a logged-in user (public signups); a link from a contact to a host record (subscription / `intercessor`) and duplicate merging; saved segments; import / export; the consent log extended with wording key + version, surface and source; settings moved to core's per-org settings pages.
- **Email provider layer:** one transport replacing core's send-only one, the inbox's own and Doxa's marketing one; separate sending domains; webhooks → global suppression; per-tenant throttling and complaint auto-pause.
- **Global suppression:** a table outside org scoping, owned by the email layer; the CRM and inbox check it.
- **Marketing layer (from Doxa):** audiences from a registry the host fills (the CRM supplies "consented to updates"; prayer.tools adds "people in this campaign", "people from past campaigns"); per-tenant senders and branding; signed unsubscribe tokens and a layer-owned unsubscribe page; the parent record for multi-site sends; the personal template library.
- **Kernel:** a shared "for each org" helper for session-less work (the inbox and core's notifications each have their own copy).
- **Files:** a personal scope for the champion's image library.
- **One Tiptap renderer** shared by the marketing layer and prayer.tools (`tiptapToHtml`), covering every node the editor offers, including Scripture verses.
