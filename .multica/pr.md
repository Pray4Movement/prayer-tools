## GO-49: Welcome email

When someone confirms their email, they now get a welcome email from the site, like the original campaigns plugin sent. It contains:

- a greeting (with their name if they gave one) and a thank-you for joining the campaign
- the campaign start date, if the campaign hasn't started yet
- their prayer times, e.g. "Every day at 7:00 AM (Asia/Beirut) · 15 minutes". Weekly times list their weekdays. Chosen dates (24/7) are listed one per line, up to 10, followed by "and N more"
- a **Start praying** button (a personal pray link, so praying from it counts as activity)
- a link to add their prayer times to a calendar (their personal ICS feed)
- an invite link with their referral code
- a footer with manage and unsubscribe links, plus a `List-Unsubscribe` header

**When it's sent**
- The first time someone clicks the verification link. A second click doesn't send another one.
- At signup, when the address is already verified (Google / Apple sign-in). These signups get no verification email, so this is the email they get instead.

The email is translated into en, es, fr, pt and ar. It is also on the admin page **Marketing → Test emails** under the name "Welcome".

**Verified**
- In the browser on a local `ramadan-demo` site, I signed up, clicked the verification link from Mailpit and got the welcome email. Its calendar link returns `text/calendar`. Clicking the verification link again did not send a second welcome email.
- New unit tests in `packages/shared/test/welcome-email.test.ts`. Shared tests and typecheck pass. Public tests pass, and so does the worker RLS test.
- No new typecheck or lint errors in the changed files. The admin and public apps already had typecheck and lint errors before this change.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
