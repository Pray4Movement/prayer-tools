# Campaign types

A campaign type is a preset over a few independent settings. Types and their defaults live in code; a campaign stores its type and any overrides.

## Settings

| Setting | Options |
|---|---|
| Timing | **fixed** (start + end) · **ongoing** (start, no end) · **personal start** (each intercessor's day 1 is the day they sign up) |
| Content cadence | daily · weekly |
| Goal | 24/7 coverage · prayer time per day (e.g. 24 hours every day) · people praying |
| Commitments | recurring (daily / weekly at a time) · specific dates (24/7 only) |

## Types

| Type | Timing | Cadence | Goal | Commitments |
|---|---|---|---|---|
| 24/7 event (Ramadan and other events) | fixed, any dates | daily | 24/7 coverage | recurring + pick dates |
| Ramadan 24h per day | fixed, ~30 days | daily | 24 hours of prayer per day | recurring |
| Ongoing (Doxa-style) | ongoing | daily | people praying (assumed) | recurring |
| Year-long weekly (e.g. schools) | fixed, ~1 year | weekly | open | weekly (assumed) |
| Personal start (devotional, crisis) | personal start | daily | open | daily from signup |

## Content

- Content is a numbered sequence of entries (1…N) with a cadence. Today's entry = anchor + cadence, where the anchor is the run start (fixed, ongoing) or the person's start (personal start).
- Public URLs address the entry number, so pages stay shared and edge-cacheable even for personal-start campaigns. Reminders and the app compute which entry a person is on.
- Personal start suits devotionals and crises where people should start praying right away, daily.

## 24/7 coverage and DST

24/7 coverage is used for fixed-date events in general, so DST must be handled.

- **Calculation:** the run is a grid of real 15-minute instants from run start to run end (a DST day in the campaign's timezone simply has 92 or 100 slots). Each recurring commitment expands to occurrences by converting date + time in its anchor timezone to UTC; picks are instants already. Each occurrence marks the slots it overlaps. Coverage = share of slots with at least one intercessor. Because everything is in real instants, the result is exact across DST.
- **Where DST bites:** not the maths but the behaviour. A daily commitment anchored to the intercessor's local time moves by an hour in real time at their DST change, so the grid correctly shows a gap in one slot and a double in another. Anchoring to the campaign's timezone doesn't avoid it: the campaign's own change day skips or repeats an hour.
- **Specific-date picks are unaffected** — they are absolute instants.
- **Policy (leaning):** anchor recurring commitments to the intercessor's local time. The grid then shows where people will actually pray, so "real 24/7 coverage" is an honest claim; gaps created by a DST change show up on the calendar to be filled.
- **Alternative still worth considering:** anchor to UTC. Simpler and the grid stays full, but the intercessor's local time shifts by an hour, and people who keep their habit leave real gaps the grid doesn't show.
- **Rejected:** asking intercessors to choose — they shouldn't have to think about DST.
- **Calendar:** the same expansion gives coverage % per day (days in the campaign's timezone) and per-slot counts for the day view, as the current calendar shows.
- **Storage:** coverage is derived from the commitments, never stored as future rows. Short runs expand in memory on request and are cached briefly; long runs keep one slot-count array per run, updated when a commitment changes and rebuilt nightly.
- **Ramadan note:** with current rules no timezone changes offset during Ramadan 2027 through 2034, so Ramadan runs in those years never hit the policy question.

## Open

- Port 24/7 coverage or not; if ported, confirm the DST policy (local-time anchor vs UTC).
- Personal start: what happens when the content runs out (complete and stop reminders, or loop), and whether a crisis also needs dated updates everyone sees.
- Goals for ongoing and year-long weekly campaigns.
- Monthly cadence (WordPress supports it).
