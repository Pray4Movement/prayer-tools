# Migration from WordPress

Source: the WordPress multisite at `/Users/jd/code/sites/campaigns/app/public/` (Disciple.Tools theme + `disciple-tools-prayer-campaigns` plugin, one subsite per champion, production on `*.prayer.tools`).

## Strategy

- **Campaigns on the prayer.tools WordPress server move in one cutover.** The DNS setup can't serve WordPress campaigns and v3 subdomains on prayer.tools at the same time.
- **Rehearse on staging** (a different domain) with full MySQL exports: run the importer, compare the report against WordPress, run the acceptance checks, fix, repeat until clean.
- **Cutover:** put WordPress in maintenance mode (its reminders stop) → export MySQL → import into v3 → switch the prayer.tools DNS to v3 → run the acceptance checks against the live domains. Pick a quiet time, well clear of Ramadan.
- Reminders due during the maintenance window are skipped; v3 resumes with the next ones.
- Campaigns can still be created in WordPress until the cutover, possibly with a warning that a migration is coming.
- **Champions** are told in advance what the migration involves, and emailed before and after.
- **Rollback:** the WordPress server keeps running with email disabled, so DNS can be switched back if something goes badly wrong.
- **Campaigns on other servers** with their own custom domains are imported one at a time from their own databases: maintenance mode → import → the champion points their domain at the Cloudflare for SaaS fallback origin → acceptance checks.
- **The WordPress plugin** is maintained for a while with security fixes only.

## Importer and checks

- The importer is re-runnable and produces a report comparing both systems: subscribers, commitments, content entries per language, stories, totals.
- Automated acceptance checks open sample magic links, prayer content links, ICS feeds and campaign URLs, and compare counts and sampled content.
- Ended or inactive campaigns are imported as archived, with content and stats, so their old URLs still work.

## Importer scope

| WordPress | v3 |
|---|---|
| Subsite + `campaigns` posts | campaign (tenant) + runs; campaign type mapped to start, end, goal and cadence |
| Champion users | accounts + campaign membership |
| `subscriptions` posts, contact email, timezone, language | person, contact method (verified status kept), subscription |
| `dt_reports` `recurring_signup` rows (rule in payload) | commitment rules; pre-expanded slot rows are dropped |
| `selected_time` rows without a rule ("pick" mode) | 24/7 date-list commitments |
| Marketing opt-ins | consent ledger rows with source `WordPress import`; existing consent is kept |
| `landing` prayer fuel posts per day / language | prayer content per run / day / language |
| `dt_translations`, campaign settings | per-campaign strings and settings (only non-default values) |
| Stories, contact-us comments | stories / messages |
| Magic keys | stored hashed so old links resolve |

Past prayer times and historical stats: import aggregates for past runs rather than every past slot row.

## Links that must keep working

- Subscriber manage magic links (`/subscriptions_app/manage/<key>`)
- Personal prayer content links (`/prayer/fuel/<key>`)
- Calendar feed / ICS URLs already in people's calendars
- Campaign URLs, including the `/{campaign_url}/...` paths inside a subsite and old v3 redirects

The public server serves these URL shapes for migrated campaigns and redirects to the new pages.

## Open

- Network-level data (the `wp_praying` counter, P4M tracking dashboards, the global campaign directory on prayer.tools) — what carries over.
- Subsites holding several campaigns: runs of one campaign (e.g. Ramadan 2025 and 2026) or separate campaigns — likely decided per subsite during import.
