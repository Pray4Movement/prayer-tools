# Migration from WordPress

Source: the WordPress multisite (Disciple.Tools theme + `disciple-tools-prayer-campaigns` plugin, one subsite per champion, production on `*.prayer.tools`).

## Strategy

- **Sites on the prayer.tools WordPress server move in one cutover.** The DNS setup can't serve WordPress subsites and v3 subdomains on prayer.tools at the same time.
- **Rehearse on staging** (a different domain) with full MySQL exports: run the importer, compare the report against WordPress, run the acceptance checks, fix, repeat until clean.
- **Cutover:** put WordPress in maintenance mode (its reminders stop) → export MySQL → import into v3 → switch the prayer.tools DNS to v3 → run the acceptance checks against the live domains. Pick a quiet time, well clear of Ramadan.
- Reminders due during the maintenance window are skipped; v3 resumes with the next ones.
- Campaigns can still be created in WordPress until the cutover, possibly with a warning that a migration is coming.
- **Champions** are told in advance what the migration involves, and emailed before and after.
- **Rollback:** the WordPress server keeps running with email disabled, so DNS can be switched back if something goes badly wrong.
- **Sites on other servers** with their own custom domains are imported one at a time from their own databases: maintenance mode → import → the champion points their domain at the Cloudflare for SaaS fallback origin → acceptance checks.
- **The WordPress plugin** is maintained for a while with security fixes only.

## Importer and checks

- The importer is re-runnable and produces a report comparing both systems: subscribers, commitments, content entries per language, stories, totals.
- Automated acceptance checks open sample magic links, prayer content links, ICS feeds and site URLs, and compare counts and sampled content.
- Ended or inactive subsites are imported as archived sites, with content and stats, so their old URLs still work.

## Importer scope

| WordPress | v3 |
|---|---|
| Subsite + `campaigns` posts | site (org) + campaigns; campaign type mapped to start, end, goal and cadence; `min_time_duration` becomes the slot length; 24/7 campaigns without an end date become prayer-time campaigns (`goal_quantity` hours a day, 24 by default) |
| Champion users | accounts + org membership with a site role |
| `subscriptions` posts, contact email, timezone, language | CRM contact on the site (verified status kept), subscription; `intercessor` per verified email |
| `dt_reports` `recurring_signup` rows (rule in payload) | commitment rules; pre-expanded slot rows are dropped |
| `selected_time` rows without a rule ("pick" mode) | 24/7 date-list commitments |
| Marketing opt-ins | CRM consent and consent-log rows with source `WordPress import`; existing consent is kept |
| `landing` prayer fuel posts per day / language | prayer content per campaign / day / language |
| `dt_translations`, campaign settings | per-site strings and settings (only non-default values) |
| Stories, contact-us comments | inbox threads |
| Magic keys | stored hashed so old links resolve |

Past prayer times and historical stats: import aggregates for past campaigns rather than every past slot row.

## Links that must keep working

- Subscriber manage magic links (`/subscriptions_app/manage/<key>`)
- Personal prayer content links (`/prayer/fuel/<key>`)
- Calendar feed / ICS URLs already in people's calendars
- Campaign URLs, including the `/{campaign_url}/...` paths inside a subsite and old v3 redirects

The public server serves these URL shapes for migrated sites and redirects to the new pages.

## Open

- Network-level data (the `wp_praying` counter, P4M tracking dashboards, the global campaign directory on prayer.tools) — what carries over.
- Subsites holding several campaigns: campaigns of one site (e.g. Ramadan 2025 and 2026) or separate sites — likely decided per subsite during import.
