# prayer.tools v3 — with orgs

Implementation of the plans in [plans/](plans/): each site is a Nuxtinator org; the admin app is Nuxtinator (core, tenancy, email-mailgun, ai, crm, inbox) plus a prayer.tools layer and a marketing layer; the public server and the worker are separate processes on the same Postgres. The mobile app is not part of this repo.

## Layout

| Path | What |
|---|---|
| `packages/shared` | Domain logic used by every process: DB types and the two RLS scopes (site, person), campaign setup and templates, commitment schedules and 24/7 coverage (DST-exact), subscriptions and signup, CRM and inbox adapters, email transport (Mailgun / SMTP) and branded templates with email i18n, signed links, stats, Statinator relay, Cloudflare for SaaS, Turnstile, the marketing host adapter. |
| `apps/admin` | `app.prayer.tools` — Nuxtinator host (SPA). Fetched layers in `_layers/` (see `layers.ts`, `layers.lock.json`); our layers in `apps/admin/apps/`: `prayertools` (sites, campaigns, content, libraries, landing page, intercessors, stats, domains, team, operator screens) and `marketing` (site email, templates, multi-site sends, one-click unsubscribe; written to move into Nuxtinator later). Owns every migration. |
| `apps/public` | Site domains, `api.` (app API, OpenAPI at `/v1/openapi.json`), `go.`, and `/my` — Nuxt SSR with i18n (en, es, fr, pt, ar; others fall back to English UI). |
| `apps/worker` | Reminder sweep, job queue (thank-yous, check-ins, domain alerts, push announcements), marketing delivery, hourly/daily sweeps (closing campaigns, personal-start completion, check-ins, unverified cleanup, app inactivity, stats refresh, domain health, retention, partitions). |
| `scripts/` | `db-setup.ts` (roles + database), `migrate.ts` (migrations without booting the admin app), `seed-dev.ts` (sample library and sites), `admin-shots.ts` (screenshots + console errors), `start.sh` (container entry). |
| `docs/dev-context.md` | Conventions and local environment for anyone working here. |

## Local setup

```bash
bun run setup                                  # install, fetch Nuxtinator layers, install again
bun run scripts/db-setup.ts                    # roles pt2_admin (BYPASSRLS) / pt2_app (RLS) + prayer_tools_v3_with_orgs_2
bun run scripts/db-setup.ts prayer_tools_v3_with_orgs_2_test
cp apps/admin/.env.example apps/admin/.env     # fill secrets; same for apps/public and apps/worker
bun run dev:admin                              # http://localhost:2380 — runs migrations on boot
DATABASE_URL=postgres://pt2_admin:dev@localhost:5432/prayer_tools_v3_with_orgs_2 bun run scripts/seed-dev.ts
bun run dev:public                             # http://<slug>.localhost:3380, http://localhost:3380/my, http://api.localhost:3380
bun run dev:worker
```

Mail goes to Mailpit (localhost:1025, UI :8025) in development. `PT_SECRET` must be the same for the admin app, public server and worker.

## Tests

```bash
bun run test     # shared unit tests, worker (test DB), public unit tests, marketing (test DB)
bun run smoke    # admin API and public server end-to-end checks against running dev servers
```

## Deployment

One image (`Dockerfile`); `PT_PROCESS=admin|public|worker` picks the process. Two DB URLs everywhere (`DATABASE_URL` BYPASSRLS, `APP_DATABASE_URL` RLS); the public server only needs the RLS one. PgBouncer in transaction mode is supported (`prepare: false`, GUCs are `SET LOCAL`).

## Where this differs from the plans, or stops short

- **Nuxtinator upgrades are done here, not upstream.** The marketing layer lives in `apps/admin/apps/marketing`; the CRM "system actor" is a no-login system user; the consent log's wording/surface/source go in the CRM event `meta`; global suppression is `pt_suppression`; the shared transport replaces the three email paths only for prayer.tools mail (core invites/password resets still use `email-mailgun`).
- **Manage and unsubscribe links are signed tokens** (rotatable per subscription through `manage_version`, manage links expire after 400 days) rather than stored random tokens; verification, check-in and My prayer tokens are random and stored hashed.
- **Admin UI is English only**; the public site ships five languages.
- **Not built:** sending from a champion's own domain (DKIM), the one-step 4-day → 12-day join (only `joined_from` is recorded), an operator cross-site inbox view, CI axe/RTL screenshot jobs and size budgets, the WordPress importer (legacy URL handling is in place).
