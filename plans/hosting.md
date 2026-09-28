# Hosting

Runs on either DigitalOcean or Railway, behind Cloudflare.

## Portability

- One Docker image; processes chosen by command / env: admin app, public server, worker.
- All configuration through environment variables.
- Standard Postgres + PgBouncer in transaction mode (Nuxtinator tenancy requires it; `prepare: false`). DigitalOcean managed Postgres includes a pooler; on Railway, run a PgBouncer service.
- Two DB roles (Nuxtinator tenancy): an RLS-enforced app role (admin requests and the public server, scoped to one site's org or to one person) and a BYPASSRLS admin role for migrations and the worker's set-based sweeps. Create the app role before the first deploy.
- Object storage outside both hosts: S3-compatible (Backblaze B2 or Cloudflare R2).
- Migrations run on boot of the admin app only.

## Cloudflare

- DNS, TLS and edge caching for everything.
- Cache rules: cache public pages on site hosts; bypass `app.prayer.tools`, `/manage/*`, `prayer.tools/my` and personal API routes.
- **Cloudflare for SaaS** for champions' custom domains: champions CNAME to a fallback origin; hostnames and certificates are created through the Cloudflare API. First 100 hostnames free, then $0.10 / hostname / month.

## Risk to prove early: custom domains on Railway

Railway only serves domains registered on the service, and its edge already sits behind Cloudflare. Routing thousands of Cloudflare for SaaS hostnames to it may need a Host-header rewrite with the original hostname passed in a header, and Cloudflare-in-front-of-Cloudflare caused problems for Statinator on Railway. A droplet running Caddy accepts any hostname, so it's the safe default for the public server. Spike this before committing the public server to Railway.

## Sizing (10,000 people praying per day)

| Workload | Estimate |
|---|---|
| Prayer session pings | ~150k / day, peaks around 20 writes/s |
| Reminder emails | ~5–20k / day depending on email vs app delivery |
| Public pages | mostly served from Cloudflare cache |
| Data | ~4M session rows / year; well under 10 GB total |

- One 2 vCPU / 4 GB server handles this with 10× headroom.
- For redundancy and zero-downtime deploys: 2 small app instances, 1 worker, smallest managed Postgres — roughly $60–100 / month plus email.
- Email provider is chosen via the provider layer; SES is cheapest at volume.

## Operations

- Nightly `pg_dump` to write-only object storage plus managed backups / point-in-time recovery where the host provides it; heartbeat monitoring on backups.
- Load test at 10× target (100k / day, Ramadan-morning spike) with synthetic data against signup, prayer pings and the reminder sweep.
- Runtime: Doxa hit memory leaks under Bun (email transport, analytics fetch). Either run production on Node or load-test Bun on the real email path.
  - Note: the Bun memory leak has since been fixed.

## Monitoring

- **Errors:** Sentry for the admin app, public server, worker and mobile app; tagged with site id and app version; emails and names stripped before sending.
- **Logs:** structured, with a request id and site id on every line; read in the host's log viewer.
- **Jobs:** an operator page lists failed jobs with a retry button.
- **Uptime Kuma:** push monitors for heartbeats from the worker loop, each daily job and the backups; HTTP monitors on a site page and `api.prayer.tools`.
- **Alerts:** reminders running late (the oldest due, unsent reminder is more than ~10 minutes old); bounce or complaint rate above the provider's safe level; an error spike in Sentry; uptime failures; missed backup heartbeats.
