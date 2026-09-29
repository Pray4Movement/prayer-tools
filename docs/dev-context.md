# Development context (for everyone working in this worktree)

Monorepo for prayer.tools v3 (with orgs). Plans live in `plans/` — they are the spec.

## Layout

| Path | What |
|---|---|
| `packages/shared` | `@prayertools/shared`: DB types (`src/db/schema.ts`), connections and RLS scopes (`src/db/connect.ts`, `src/db/scope.ts`, `src/db/json.ts`), domain logic (setup, schedule, coverage, content, subscriptions, stats, links, crm/inbox adapters, email transport and templates, i18n for email, statinator, cloudflare, turnstile, rate limit). Import as `@prayertools/shared/<file>` e.g. `@prayertools/shared/db/scope`. |
| `apps/admin` | Nuxtinator host (SPA) on port **2380**. Layers fetched into `_layers/` (never edit). prayer.tools' own layers in `apps/admin/apps/*`. Owns ALL migrations (`apps/admin/apps/prayertools/migrations/pt_T001_schema.ts`). |
| `apps/public` | Public server (Nuxt SSR) on port **3380**: site domains, `api.` host, `go.` host, `/my`. |
| `apps/worker` | Background worker (plain TypeScript run by bun). |
| `scripts/db-setup.ts` | Creates roles `pt2_admin` (BYPASSRLS) / `pt2_app` (RLS) and a database. |
| `scripts/seed-dev.ts` | Seeds a platform library and three sites (`ramadan-demo` published, `demo-247` published coverage, `draft-site` draft). |

## Local environment

- Postgres on localhost:5432. Dev DB `prayer_tools_v3_with_orgs_2`, test DB `prayer_tools_v3_with_orgs_2_test`.
  - Admin role URL: `postgres://pt2_admin:dev@localhost:5432/<db>` (BYPASSRLS; migrations, worker sweeps)
  - App role URL: `postgres://pt2_app:dev@localhost:5432/<db>` (RLS enforced; admin requests, public server)
- Migrations run only when the admin app boots. The admin dev server is usually running on 2380 (started by the lead); don't start/stop it unless told.
- Mailpit: SMTP localhost:1025, UI http://localhost:8025 (`MAIL_PROVIDER=smtp`).
- Sites in dev: `http://<slug>.localhost:3380`; platform host (My prayer) `http://localhost:3380/my`; API `http://api.localhost:3380`; go host `http://go.localhost:3380`. (`PT_SITE_BASE_HOST=localhost:3380`.)
- Other ports on this machine (2180, 3180, 2280, 3280) belong to other sessions: never touch those processes or other worktrees.

## RLS and scopes

- Site tables carry `org_id` with policy `tenant_isolation` on `app.current_org`. Use `withOrg(db, orgId, tx => …)` from `@prayertools/shared/db/scope`. Inserts omit `org_id` (defaults to `current_org_id()`).
- Person scope: `withPerson(db, intercessorId, …)` sets `app.current_intercessor`; `pt_subscription`, `pt_commitment`, `pt_person_total` have a SELECT policy for the person's own rows across sites. Writes always happen inside the site's org, one site at a time.
- Global tables (no RLS): `orgs`, `memberships`, `users`, `pt_intercessor*`, `pt_my_*`, `pt_suppression`, `pt_job`, `pt_site_domain`, `pt_directory_entry`, `pt_site_report`, `pt_library*`, `pt_personal_*`, `pt_legacy_key`. Always filter them explicitly.
- jsonb writes: use `jsonb(value)` from `@prayertools/shared/db/json` (a bare `JSON.stringify` stores a jsonb *string*). Arrays: `pgArray(values, 'text' | 'smallint' | …)`.
- DATE columns come back as `YYYY-MM-DD` strings from `createDb` (shared); from Nuxtinator's `db` in the admin app they come back as Dates — normalize with `toIsoDate`.

## Conventions (the user's standing rules)

- Comments: very sparing; one or two lines max stating what the code does and why. Describe the code as it is, never the change that produced it.
- Settings follow code-owned defaults: the DB stores only explicit overrides; defaults and labels live in code / i18n. Never persist a default value or a display label.
- Nuxt UI `USelect`/`USelectMenu`: never put an item with `value: ''` in `:items` (Reka throws); use `placeholder` for the empty state.
- Don't commit. Don't read other worktrees or branches. You may read `/Users/jd/code/go-saas` (Nuxtinator) and `/Users/jd/code/doxa` (Doxa, patterns only) for reference.
- Stop any server you start before finishing.
