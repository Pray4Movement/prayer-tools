# Analytics — Statinator

Events go through our own server first (the Doxa daisy-chain pattern), not from the browser to Statinator. The platform records what it needs for per-campaign stats and forwards to Statinator for cross-campaign analytics. Event names and payload conventions follow current prayer.tools campaigns. Wire it with the `/statinator` skill.

## Flow

1. **Browser / app → our server.** A small bundled client (no script loaded from the Statinator host) posts to same-origin endpoints on the campaign's own domain: `POST /api/collect` and `POST /api/collect/heartbeat`. The mobile app posts to `api.prayer.tools`. Server-side business events (signup, verification, story) originate on our server directly.
2. **Our server records it** for per-campaign stats (see below). The campaign is resolved from the request's hostname, never trusted from the client.
3. **Our server forwards to Statinator** (`POST /api/events` with `x-api-key`), adding visitor geo from the Cloudflare headers, the campaign's target coordinates and `user_hash`.

Why a relay:
- Per-campaign stats live in our database for the champion dashboards.
- Same-origin requests aren't blocked by filter lists, and no Statinator domain allowlist is needed for thousands of campaign hostnames (the relay authenticates with the API key).
- Campaign attribution is decided server-side from the hostname.

## Relay rules (from Doxa)

- `event_type` allowlist and body-size cap on `/api/collect`; the relay holds the project key, so abuse would spend Statinator's per-project budget.
- Forward in the background; the browser gets a fast `202`. Only pageviews round-trip (the event id seeds the heartbeat loop).
- One heartbeat loop per page with handoff on SPA navigation; `sendBeacon` with a `fetch(keepalive)` fallback.
- Visitor id in first-party storage, with the iframe / storage-partition fallback.
- Never forward the `cf-connecting-ip` header (Cloudflare rejects it); send geo as a body field instead.

## Per-campaign stats (local)

- Stored per campaign: pageviews and visitors, signups and verifications, sources / UTM, countries, prayer sessions and minutes, praying now.
- Raw events kept for a limited window; daily rollups per campaign kept indefinitely. Champion dashboards read the rollups.
- Prayer sessions are the same data as the praying-now ping (`prayer_session`), not a second pipeline.

## Statinator

- Project `prayer_tools_campaigns`, endpoint `https://statinator.prayer.tools`. Same project during the WordPress → v2 transition so dashboards stay continuous; events always carry `hostname`.
- Config via env (project id, API key, endpoint); forwarding no-ops when unset (local dev).
- Payload conventions: `geo` (visitor, from Cloudflare headers), `target_latitude` / `target_longitude` (the campaign's prayed-for place), `user_hash` (SHA-256 of the lowercased, trimmed email; raw email never leaves the server), `metadata` (campaign id and slug, subscription id, timezone, event-specific keys).

## Events

| Event | Fires when | Notes |
|---|---|---|
| `pageview` + heartbeats | page views on campaign sites | via the relay |
| `campaign_signup` | a new subscription is created | `frequency` in metadata |
| `campaign_signup_verified` | email verification link clicked | once per verification |
| `prayer_fuel_viewed` | the praying-now ping from a fuel page or the app | driven by the ping, not page render, so it survives edge caching; `source`: porch / manage / app |
| `prayer_story_submitted` | a story is submitted | never send the story text; campaign id + `user_hash` only |
| `campaign_created` | a campaign is created in the admin app | |
| `prayer_recorded` | "praying as a group" count submitted | `value` = number of people |
| `app_open`, `language_switched` | mobile app | device id as `anonymous_hash` |

## To verify

- Cloudflare's "Add visitor location headers" managed transform applies to Cloudflare for SaaS custom-hostname traffic.
- WordPress events carry per-subsite integer campaign ids (not unique across the network); v2 events carry the v2 campaign id plus slug.
