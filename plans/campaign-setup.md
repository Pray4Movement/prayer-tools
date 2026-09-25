# Campaign setup

There are no campaign types. A campaign is described by four setup answers; templates pre-fill them, and display and behaviour follow from them. The options and defaults live in code; a campaign stores its answers.

## Setup answers

| Question | Options |
|---|---|
| Start | **on a date** (shared calendar, everyone on the same day) · **when each person joins** (personal start: each intercessor's day 1 is the day they sign up) |
| End | **on a date** · **no end** · for personal start: **how many days** each person goes through |
| Goal | **people mobilized** (preselected, recommended) · **prayer time** (e.g. 24 hours of prayer every day) · **24/7 coverage** — offered in this order |
| Content cadence | daily · weekly |

## Length

- A shared-calendar campaign ending 50 days or less after its start displays as a **fixed** campaign.
- One ending more than 50 days after its start, or with no end, displays as **ongoing** (with or without an end date).

## Lifecycle

- **Campaign:** draft → published → archived. New campaigns start as drafts and are seen through a preview link until published. Archived campaigns show a short "this campaign has ended" page with no signup and no reminders, and can be un-archived. There is no paused state.
- **Run:** upcoming → active → ended, from its dates, never set by hand. Personal-start campaigns have no run end; each person finishes on their own.
- **Before a run starts** signup is open and reminders begin on the start date.
- **Between runs** the site shows the final results and the end-of-campaign call to action, and offers "Notify me when this campaign runs again" (the campaign-updates consent) in place of signup; those people are the audience for the relaunch invitation.

## Goals and commitments

Signup is built around the reminder (Doxa model): the intercessor says when they want to be reminded, not when they sign up to pray.

| Goal | Days + time | Duration |
|---|---|---|
| People mobilized | required | asked only when the champion turns on "track time committed" (off by default); default 15 min |
| Prayer time | required | required, intercessor's choice; default 15 min |
| 24/7 coverage | required | required; default 15 min |

- Daily means choosing a time; weekly or selected days means choosing the days and a time. There is no weekly without a day.
- The time is when the reminder is sent. Only for 24/7 coverage is it also the prayer slot that fills the coverage grid.
- One `commitment` row per prayer time. People mobilized counts distinct people with an active commitment, prayer time sums durations, 24/7 expands each row into slots.
- 24/7 campaigns also allow specific-date picks.

## Counting people

Every campaign shows the number of people signed up, whatever its goal.

- **Web:** a person counts once their email is verified (by the email link, or by Google / Apple sign-in).
- **App:** a person counts once they join the campaign and create a reminder.
- Opening prayer content and "Amen" are tracked for stats; they don't decide who counts.
- **Fixed campaigns:** everyone who committed to the run, including those who have completed it.
- **Ongoing campaigns:** people with active commitments. The app inactivity sweep and email check-ins (see [README.md](README.md)) remove people who stop.

## End of a campaign

- **Shared calendar:** when the run ends, everyone gets the end-of-run thank-you with the champion's optional message and call to action (see [admin-app.md](admin-app.md)).
- **Personal start:** when a person reaches the last day, their subscription becomes `completed` and reminders stop; it never loops back to day 1. They get the same thank-you and call to action.
- The call to action is where a campaign hands people on, e.g. the demo's "Start your own campaign" or a 4-day crisis campaign's "Join the 12-day campaign".

## Templates

A template is a preset of the setup answers, an end-of-campaign call to action and the libraries it suggests (see [libraries.md](libraries.md)). Templates live in code; the champion never sees the word "type".

| Template | Start | End | Cadence |
|---|---|---|---|
| Generic | champion chooses | champion chooses | champion chooses |
| Ramadan | on a date | ~30 days | daily |
| Natural disaster — 4 day | on a date | 4 days | daily |
| Natural disaster — 12 day | on a date | 12 days | daily |
| Prayer.Tools demo (evergreen) | when each person joins | the demo's length | daily |

All templates preselect the people-mobilized goal.

- **4-day → 12-day:** two separate campaigns. The 4-day campaign's end-of-campaign call to action links to the 12-day one; joining is one step (the person is known, their reminder time carries over, consent boxes are asked again), and the 12-day campaign records that they joined from the 4-day one.
- The demo ends with a call to action to start a campaign.

## Content

- Content is a numbered sequence of entries (1…N) with a cadence. Today's entry = anchor + cadence, where the anchor is the run start (shared calendar) or the person's start (personal start).
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

- Confirm the 24/7 DST policy (local-time anchor vs UTC).
- Whether an app commitment needs more than a reminder to count toward the people number.
- Whether a crisis campaign also needs dated updates everyone sees.
- Monthly cadence (WordPress supports it).
