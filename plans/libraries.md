# Content libraries

Reusable prayer content that champions can use directly or modify. prayer.tools curates libraries; champions can create their own and ask for them to be shared with everyone.

## What a library is

- An ordered sequence of entries (1…N) with a cadence (daily or weekly), in one or more languages. Entries are Tiptap JSON.
- Examples: a 30-day Ramadan pack, a 40-week school series, a 21-day devotional.
- Entries can use placeholders (campaign name, place or people group, dates) so one library reads naturally in many campaigns without edits. Today's Ramadan plugins do this by templating people-group names into the content.
- A campaign's run can use several libraries stacked per day (e.g. a daily focus plus scripture), as Doxa does.

## Using a library

- **Direct use:** the run references the library. Entries render from the library, so fixes, improvements and new translations reach the campaign automatically.
- **Modify:** the first edit to any entry gives the campaign its own copy of that library, frozen at the version it was on. From then on library updates never change the campaign's copy, edited and unedited entries alike. Other libraries the campaign uses keep following until they are edited too.
  - The champion sees when the library has a newer version, can compare, and can choose to take it, which replaces their edits to that library.
  - An edit in one language leaves the entry's other languages on the library's text; the champion is offered AI translation of the edit or can mark those languages as following their edit.
- **Relaunch:** a new run reuses the same libraries, picking up the latest published version of each library the campaign hasn't edited; edited copies carry over.

## Ownership and sharing

- **Platform libraries:** created and maintained by the prayer.tools team through an operator-only screen, available to every campaign.
- **Champion libraries:** created in the admin app; private to their owner.
- **Share request:** the owner requests sharing → prayer.tools reviews → the library is published to the catalog for everyone.
- **Versions:** the owner edits a draft and publishes; campaigns that haven't edited the library follow the latest published version, so work in progress never reaches other campaigns.
- Libraries sit outside campaign tenant isolation: readable when you own them or when they are published. A campaign's edited copy belongs to the campaign and stays tenant-scoped.

## Catalog

- Browse and search by cadence, length, language and topic; preview entries before choosing.
- Libraries can be linked to templates. Choosing a template shows its linked libraries (e.g. Ramadan shows Ramadan libraries); "See more" lists all the others.
- Import existing content packs (the Ramadan packs, WordPress prayer fuel exports) as platform libraries.

## Scripture

Verses come from the bolls.life API, as in Doxa; Scripture is never AI-translated.

## Open

- Who owns a champion library: the champion (usable across all their campaigns) or a campaign (editable by that campaign's team).
- Attribution and editing rights once a champion's library is shared (can the owner keep publishing updates to everyone, or does prayer.tools take over maintenance).
