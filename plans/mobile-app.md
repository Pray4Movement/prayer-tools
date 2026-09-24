# Mobile app

One app where an intercessor follows several campaigns, each with one or more prayer times.

## Starting point

Copy the Doxa prayer app (`/Users/jd/code/doxa/doxa-prayer-mobile-app`, Flutter) to get started; it becomes its own codebase from then on.

## Kept from Doxa

- **Anonymous start** — pray immediately; server-minted identity, no login.
- **Local reminders** — repeating weekly notifications, one per distinct campaign × weekday × time. Commitments with app delivery never trigger server email.
- **Prayer sessions** — pings while praying (upsert per session) feed "praying now" and activity; "Amen" logs a completed prayer.
- **Native Tiptap rendering** of prayer fuel, with an offline file cache.
- **Several campaigns per device**, several reminders per campaign.
- **OneSignal** for push.
- **Server-side inactivity sweep** — 30 days without prayer per campaign marks the subscription inactive; activity reactivates it; explicit unsubscribe is sticky.

## Changes for prayer.tools

- **Real schedules on the server.** Each reminder is sent as its own commitment rule (days, time, duration, timezone) so it counts toward coverage. Doxa merges a group's reminders into one schedule and has no duration.
- **Per-device credential** issued at registration, stored in Keychain / secure storage (survives reinstall on iOS). No bundled app secret; no id that doubles as a bearer token or returns plaintext email.
- **Campaign lifecycle awareness.** The app refreshes campaign and subscription status on open; a silent push triggers rescheduling when a run ends or a subscription goes inactive, so reminders stop.
- **Timezone** re-sent when it changes.
- **Per-campaign** branding, stats, praying-now and run start dates (Doxa has one global start date).
- **Discovery** via deep links and QR (`*.prayer.tools`, `go.prayer.tools`) plus a paginated campaign directory.
- **Server-sent push** (announcements, relaunch invitations) — built on the platform side.

## Change at copy time

- Bundle ids, URL scheme, method channels, OneSignal app and app group, Firebase project, store listings
- API base → `api.prayer.tools/v1`, paths shaped around campaigns
- Identity storage → secure storage with per-device credentials
- Associated domains → `*.prayer.tools`, `go.prayer.tools`
- prayer.tools branding for the app itself

## Later

- **Email linking** — adds recovery on a new phone, the web manage page and optional email reminders; magic link that opens the app (no codes). Merging an anonymous person into an existing email identity is a repoint of `person_id`.
- App Attest / Play Integrity if fake commitments appear.
