# What changed

## 7. Invoices, multi-device access links, and bcrypt admin auth

**Invoice PDFs (customer + admin):**
- New `lib/invoice.ts` renders a one-page order invoice as a PDF, on
  demand, from data already in the database (buyer details, product,
  payment reference, amount, a deterministic invoice number, paid date).
- `app/api/payment/verify/route.ts` now generates that PDF the moment a
  payment is confirmed — **before** the download link is ever emailed —
  and attaches it directly to the order confirmation email, alongside a
  "view invoice" link.
- New `app/api/invoice/[token]/route.ts`: the buyer can re-download their
  invoice anytime from their access page. Rate-limited and gated on a paid
  access token, but deliberately **not** device-locked, since it's not the
  paid product itself and buyers reasonably want it from any device.
- New `app/api/admin/invoice/[id]/route.ts` + a **PDF** button per row in
  the admin **Submissions** table, so support/finance can pull any paid
  order's invoice without touching the database.

**Access links were locked to a single device — this was the "already in
use" problem:**
The previous fix (see #2 below) bound a paid link to the *first* device
that opened it, which meant a genuine buyer confirming on their phone and
then trying to read the file on their laptop got blocked exactly like a
stranger with a forwarded link would.
- `prisma/schema.prisma`: `deviceToken String?` → `deviceTokens String[]`.
- `MAX_DEVICES` (`lib/tokens.ts`, default **2**) is the new cap. Claiming
  (`app/api/access/claim/route.ts`) uses a single atomic SQL statement —
  `array_append(...)` guarded by `cardinality(...) < MAX_DEVICES` — so a
  burst of near-simultaneous opens (two tabs, a slow redirect) can never
  push the array past the limit.
- `app/access/[token]/page.tsx` and `app/api/download/route.ts` both check
  membership in the array instead of equality against a single token.
- **Setup required:** run `npx prisma db push` again — the column changed
  shape from `String?` to `String[]`.

**Admin password is now bcrypt-hashed:**
- `ADMIN_SECRET` (plaintext, compared with `crypto.timingSafeEqual`) is
  replaced by `ADMIN_PASSWORD_HASH` (a bcrypt hash, compared with
  `bcrypt.compare`) in `lib/adminAuth.ts`. The real password is never
  stored anywhere now, not even in `.env` — only its hash.
- Generate the hash once with:
  `node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"`
  and put the result in `ADMIN_PASSWORD_HASH`.
- `app/api/reviews/[id]/route.ts` had its own duplicate admin check — it
  now reuses the same `verifyAdminPassword` helper instead of comparing a
  separate copy of the secret.
- **Setup required:** set `ADMIN_PASSWORD_HASH` in your environment (see
  `.env.example`) before deploying — the old `ADMIN_SECRET` var no longer
  does anything.

---

# Before you deploy

1. `npm install`
2. `npx prisma db push` — required for the `deviceTokens` column change.
3. Set `ADMIN_PASSWORD_HASH` in your environment (see above) — logins with
   the old `ADMIN_SECRET` will stop working.
4. `npm run build` locally to catch anything environment-specific (this
   sandbox couldn't reach `binaries.prisma.sh`, so `prisma generate`
   couldn't run and the Prisma-typed files couldn't be fully verified here
   — everything was checked by hand against the schema and by
   syntax-checking every changed file, but a real `npm run build` is worth
   doing before you push live).

---

## 0. Video/file uploads 413'd, and the analytics chart's day/week/month buckets were wrong

**413 FUNCTION_PAYLOAD_TOO_LARGE on upload (even a 5MB image):**
The old `/api/admin/upload` received the file itself as a multipart POST
body. Vercel serverless Functions hard-cap the request body at ~4.5MB —
a platform limit, not something app code (or `maxDuration`/route config)
can raise — so any file near or over that size 413'd before this app's
own size checks ever ran.

**Fix — upload straight from the browser to Storage:**
- New `app/api/admin/upload/sign/route.ts`: validates the file's type/size,
  then mints a one-time Supabase Storage signed upload URL (service-role
  key stays server-side).
- `app/admin/page.tsx`: the browser now calls that endpoint, then uploads
  the file bytes directly to Supabase Storage with
  `supabase.storage.from(bucket).uploadToSignedUrl(...)` — the file never
  passes through this app's server at all.
- `app/api/admin/upload/route.ts` now only receives the small JSON result
  (text fields + the resulting URLs) to save to the database — well under
  any body-size limit no matter how large the video is.
- New `lib/supabaseBrowser.ts` — a browser-only Supabase client using the
  public **anon** key (never the service role key). **Requires two new env
  vars**, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` —
  see `.env.example`; both come from the same Supabase dashboard page as
  the keys you already have.

**Analytics dashboard bucketing was wrong:**
- All day/week/month bucketing used UTC. Since the store's numbers are in
  IST (UTC+5:30), a sale made after ~5:30pm IST was counted as happening
  the *next* day in UTC — the cause of "today's sales"/daily numbers
  looking off. Every date bucket (`app/api/admin/analytics/route.ts`) is
  now computed in IST.
- The 6-month and yearly charts built each month's bucket with
  `date.setUTCMonth(date.getUTCMonth() - i)` starting from *today's*
  day-of-month. That overflows in months shorter than the current day
  (e.g. Aug 31 minus 6 months lands on Mar 2/3, since February doesn't
  have 31 days), silently duplicating one month and skipping another —
  the "gap between months isn't right" bug. Fixed by computing each
  month's bucket from the 1st of the month instead.
- Added the missing **Month** tab (last 30 days, daily buckets) between
  Week and 6 Months — the range picker only had Day/Week/6 Months/Year
  before.

## 1. Theme toggle alignment
`components/ThemeToggle.tsx` — rewrote the track/knob/icon layout with exact,
symmetric measurements (w-14 h-8 track, h-6 w-6 knob inset by 4px on every
side) instead of hand-picked offsets, so the sun/moon icons and the sliding
knob now line up correctly in both states.

## 2. Access links were shareable after payment
This was real: anyone who got hold of `/access/{token}` could open it and
download the file — there was nothing tying it to the original buyer beyond
the (forwardable) URL itself.

**Fix — one-device claim:**
- Added a `deviceToken` column on `Submission` (`prisma/schema.prisma`).
- The *first* browser to open a paid `/access/{token}` link "claims" it: a
  new route (`app/api/access/claim/route.ts`) generates a random secret,
  saves it on the submission, and sets it as an httpOnly cookie, then
  redirects back to the access page.
- Every visit after that compares the request's cookie to the saved
  `deviceToken`. If they match, the page shows normally. If they don't
  (a different device/browser opened the same link), the page now shows a
  clear **"This link is already in use"** message with a **Back to home**
  button, instead of the file.
- The same check was added to `/api/download` directly, so the block can't
  be bypassed by calling the download API with just the token.

**Trade-off to know about:** this binds the link to one device. If a
genuine buyer wants it on a second device (e.g. confirmed on phone, wants
it on a laptop too), they'll also see the blocked page and need to contact
support. If you'd rather allow e.g. 2–3 devices instead of 1, that's a small
change to the claim logic — say the word and I'll adjust it.

**Setup required:** run `npx prisma db push` (or your usual migration
command) against your database before deploying, so the new `deviceToken`
column actually exists.

## 3. Uploaded video not playing
Found the likely real cause: `lib/supabase.ts`'s `ensureBucket()` only
created the storage bucket if it didn't exist yet — if the `uploads` bucket
already existed (e.g. created manually in the Supabase dashboard, or from
before the public/private split existed in this codebase) with the wrong
visibility, new video uploads would succeed but the public URL the app
returns would 400/403 in the browser. That looks exactly like "uploaded
fine, just won't play."

**Fix:** `ensureBucket()` now checks the existing bucket's `public` flag and
corrects it automatically if it doesn't match what's expected.

Also hardened `components/VideoShowcase.tsx`: calls `.load()` before
`.play()` so a `preload="none"` video actually has something to play,
remounts the `<video>` element when the source changes (so a fresh upload
can't get stuck showing a previous error state), and switched
`preload="none"` → `"metadata"` for more reliable first-tap playback.

**If it's still not playing after this:** check your Supabase project has
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` set correctly and that the
`uploads` bucket is reachable — the admin upload form will now surface a
clearer error if not.

## 4. Admin dashboard unreadable in dark mode
Root cause: your site auto-switches to dark mode at night (or when
manually toggled), which flips heading/body text colors (`text-brick-950`,
`text-brick-700`) to a near-white color for readability against a dark
background — but the entire `/admin` dashboard had **hardcoded light
backgrounds** (`bg-white`, `bg-cream`) with no dark-mode variants. Result:
near-white text on a white background — invisible, exactly like your
screenshots.

**Fix:** added `dark:` variants throughout `app/admin/page.tsx` — page
background, header, cards, inputs, table rows, status badges, chart grid
lines and axis labels — all now adapt properly. Reused the site's existing
`.card` utility class where possible for consistency.

## 5. Dark/light toggle added to the admin nav
`ThemeToggle` is now rendered in the admin header (top-right, next to the
tabs) and on the login screen — previously it only existed on the public
site, not the admin dashboard.

## 6. Analytics page redesign
`app/api/admin/analytics/route.ts` now returns four time ranges instead of
two: `daily` (last 14 days), `weekly` (last 8 weeks), `sixMonth` (last 6
months), `yearly` (last 12 months).

`app/admin/page.tsx` analytics tab:
- Stat cards now have icons and proper dark-mode contrast.
- Sales & revenue is now one chart pair (bar = sales, line = revenue) with
  a **Day / Week / 6 Months / Year** range switcher, instead of four
  separately-titled charts.
- Rating breakdown replaced the pie chart with a proper review-summary
  card: big average number + stars on the left, a 5★→1★ bar breakdown with
  counts on the right — reads at a glance, same pattern Amazon/Flipkart use.
