# Migration from WordPress

Source: the WordPress multisite at `/Users/jd/code/sites/campaigns/app/public/` (Disciple.Tools theme + `disciple-tools-prayer-campaigns` plugin, one subsite per champion, production on `*.prayer.tools`).

## Strategy

1. **Pilot:** new campaigns, plus a few willing existing ones, run on v2 while WordPress keeps serving the rest.
2. **Move everyone:** import the remaining campaigns and retire the WordPress network. Having everyone on one system avoids long-term confusion.

## Coexistence

- WordPress keeps the `*.prayer.tools` wildcard; each v2 campaign gets a specific DNS record, which takes precedence over the wildcard. The wildcard flips to v2 when everyone has moved.
- Custom domains move one at a time (Cloudflare for SaaS hostname created as the campaign moves).
- When a campaign is imported, its WordPress reminders stop in the same step — never both systems sending.

## Importer scope

| WordPress | v2 |
|---|---|
| Subsite + `campaigns` posts | campaign (tenant) + runs; campaign type mapped to start, end, goal and cadence |
| Champion users | accounts + campaign membership |
| `subscriptions` posts, contact email, timezone, language | person, contact method (verified status kept), subscription |
| `dt_reports` `recurring_signup` rows (rule in payload) | commitment rules; pre-expanded slot rows are dropped |
| `selected_time` rows without a rule ("pick" mode) | 24/7 date-list commitments |
| Marketing opt-ins | consent ledger rows with source `WordPress import`; existing consent is kept |
| `landing` prayer fuel posts per day / language | prayer fuel per run / day / language |
| `dt_translations`, campaign settings | per-campaign strings and settings (only non-default values) |
| Stories, contact-us comments | stories / messages |
| Magic keys | stored hashed so old links resolve |

Past prayer times and historical stats: import aggregates for past runs rather than every past slot row.

## Links that must keep working

- Subscriber manage magic links (`/subscriptions_app/manage/<key>`)
- Personal prayer fuel links (`/prayer/fuel/<key>`)
- Calendar feed / ICS URLs already in people's calendars
- Campaign URLs, including the `/{campaign_url}/...` paths inside a subsite and old v3 redirects

The public server serves these URL shapes for migrated campaigns and redirects to the new pages.

## Open

- Network-level data (the `wp_praying` counter, P4M tracking dashboards, the global campaign directory on prayer.tools) — what carries over.
- Subsites holding several campaigns: runs of one campaign (e.g. Ramadan 2025 and 2026) or separate campaigns — likely decided per subsite during import.
