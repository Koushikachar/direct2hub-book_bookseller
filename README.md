# Direct2Hub — Digital Product Landing Page

Next.js (App Router, TypeScript) + PostgreSQL (Prisma) + local file storage.
No email service, no third-party storage account, no paid tiers required to
run it.

## What's included
- **Nav**: sticky glass nav — logo + brand on the left, **Home / About / Contact / Price**
  links plus a sun/moon **dark-light toggle** on the right. The toggle follows your
  device's clock by default (light 6am–6pm, dark otherwise) and switches
  automatically as the day goes on; click it once to pin a theme manually,
  double-click to go back to automatic. No flash-of-wrong-theme on load.
- **Home page** (`/`): marketing landing page — a vertical showcase video in a
  phone-style player, feature highlights, stats, and a CTA into pricing.
- **About page** (`/about`): the company story, the showcase video again, and a
  **gamified PDF preview** — flip three real pages from the playbook to reveal
  chapter takeaways, then a locked "unlock the full playbook" card links to
  checkout. Only a 3-page teaser is ever shown here; the real file stays
  behind payment + the access-token gate below.
- **Contact page** (`/contact`): a working contact form (`/api/contact`) that
  emails the admin inbox and auto-replies to the sender via Gmail SMTP (see
  Email below), plus phone/WhatsApp/social links pulled from the same
  product content the admin panel edits.
- **Price page** (`/price`): the original product page + sticky order form
  (Name, Email, WhatsApp with country code, **Continue to payment**) and a
  **Terms** link that opens a full terms modal, plus the reviews list.
- **One request per person**: the same email or WhatsApp number can only be
  used once — a repeat attempt is rejected, not silently reissued.
- **On submit**: saved to Postgres, Razorpay order created, then straight to
  a private download page after payment — no manual approval step.
- **`/access/[token]`**: each link allows **3 downloads total**; the 4th
  attempt is blocked with a clear message. The counter update is atomic, so
  a burst of simultaneous clicks can't sneak past the limit. Nothing is
  downloadable without a paid submission — this is the "no one gets in
  without filling the form" gate.
- **Customer reviews**: 33 seeded reviews (average **4.7**⭐) shown at the
  bottom of the pricing page, with a rating breakdown bar chart. Anyone can
  write a review; JSON-LD `AggregateRating` is included for SEO.
  - A reviewer can **edit or delete their own review** later from the same
    browser (a private edit token is issued once and kept in
    `localStorage` — nobody else can use it).
  - **Admins can edit or delete any review** (including the seeded ones)
    from `/admin`.
- **`/admin`**: password-protected, four tabs:
  - **Analytics** — total revenue, total sales, today's sales, submissions,
    conversion rate, average rating, plus charts: weekly sales (bar),
    monthly revenue (line), monthly sales count (bar), and a rating
    breakdown (pie) — all built with Recharts against `/api/admin/analytics`.
  - **Product Content** — upload the logo, cover image, showcase video, and
    PDF (written straight to Supabase Storage — no local disk needed), and
    edit all text content including the new home-page tagline.
  - **Submissions** — paginated table of every form entry, plus a
    **Download as Excel (CSV)** export that streams in batches (safe even
    with millions of rows).
  - **Reviews** — edit or delete any customer review.

## Email (free, via Gmail)
`lib/mailer.ts` sends email through your own Gmail account's SMTP — no paid
email service, no third-party API key. Two emails are wired up:
- **Order confirmation** — sent automatically the moment a payment is
  verified (`app/api/payment/verify/route.ts`), with a styled HTML email and
  a button linking straight to the buyer's private download page.
- **Contact form** — every message from `/contact` emails your inbox
  (`GMAIL_USER`) and auto-replies to the sender.

Setup: enable 2-Step Verification on the sending Gmail account, generate an
**App Password** (Google Account → Security → App passwords), and set
`GMAIL_USER` / `GMAIL_APP_PASSWORD` in `.env`. If these aren't set, email
sending is skipped silently — it never blocks a payment or a form submit.

## Adding your video
The showcase video used in the Home and About pages is expected at
`public/videos/showcase.mp4` (poster frame at `public/videos/video-poster.jpg`).
Drop your video file at that path — or upload it from `/admin` → **Product
Content** → **Showcase video**, which stores it in Supabase and points
`Product.videoUrl` at it instead. A 300MB+ vertical video works but is heavy
for a lot of visitors; for production, consider compressing it or hosting it
on a CDN/video host (Cloudinary, Mux, Bunny, YouTube unlisted) and pointing
`videoUrl` at that instead of local storage.



## Security
- **Rate limiting** on every public and admin endpoint (`lib/rateLimit.ts`):
  5 form submissions / 10 min / IP, 30 downloads / min / IP, 20 admin
  requests / min / IP, 5 review submissions / hour / IP. Works out of the
  box with zero setup (in-memory); set `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN` (Upstash's free tier) once you run more than
  one server instance, so limits stay consistent across all of them.
- **Admin password is bcrypt-hashed** (`lib/adminAuth.ts`) — only
  `ADMIN_PASSWORD_HASH` (a bcrypt hash) is ever stored, never the plaintext
  password; login compares with `bcrypt.compare`, every attempt is
  rate-limited, and every auth failure returns the same generic
  "Unauthorized" regardless of the reason.
- **Review edit tokens are hashed** (`lib/reviewAuth.ts`) — only a SHA-256
  hash is stored in the database, so editing someone else's review isn't
  possible even with direct database access.
- **Strict upload validation** — server-side MIME-type allow-list and size
  caps (5MB images, 25MB PDF) on `/admin` uploads, with randomized
  filenames so nothing is ever saved using a user-supplied name/path.
- **Security headers** (`next.config.ts`): CSP, HSTS, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **No SQL injection surface** — every query goes through Prisma's
  parameterized query builder; there's no raw SQL anywhere in the app.
- **Uniqueness enforced at the database level** on email and WhatsApp
  number, so duplicate submissions can't slip through even under
  concurrent requests.
- Input length limits and format checks on every public endpoint to block
  malformed/oversized payloads.
- **Invoices**: every paid order gets a PDF invoice, generated server-side
  on demand (`lib/invoice.ts`) — attached automatically to the order
  confirmation email *and* downloadable anytime from the buyer's access
  page or `/api/invoice/[token]` (rate-limited, requires the paid access
  token; not device-locked so it's reachable from any of the buyer's
  devices). Admins can pull the same PDF for any paid submission from
  **Submissions → PDF** or `/api/admin/invoice/[id]` (admin-auth required).
- **Multi-device access links**: a paid `/access/[token]` link can be
  claimed on up to `MAX_DEVICES` (`lib/tokens.ts`, default 2) distinct
  browsers/devices — e.g. a buyer's phone and laptop — using an atomic
  `array_append` guarded by `cardinality(...) < MAX_DEVICES` so a burst of
  simultaneous opens can never exceed the limit. Once the limit is reached,
  any further device sees "This link is already in use" instead of the
  file, and the same check is enforced again directly on `/api/download`
  so it can't be bypassed by calling the API with just the token.

No app-level codebase can *guarantee* zero downtime at literally any load —
that also depends on your hosting plan's autoscaling and your database's
connection limits. What's built in here is everything within the code's
control: caching, pooling, indexes, pagination, and streaming.

## Built for heavy traffic
- **Cached home page** (`export const revalidate = 60` in `app/page.tsx`).
- **Pooled database connections** — a pooled `DATABASE_URL` (e.g. Neon's
  `-pooler` endpoint) for runtime queries, a separate `DIRECT_URL` only for
  migrations.
- **Indexed lookups** on `email`, `whatsapp`, `accessToken` (unique) and
  `createdAt` (for ordered pagination).
- **Paginated + streamed admin data** — submissions load 50 rows at a time;
  export streams the CSV in 1,000-row batches via cursor pagination.
- **Atomic download-limit check** — a single conditional database update,
  correct even under concurrent requests.

## SEO
- Full metadata (title template, description, keywords, canonical URL,
  Open Graph + Twitter cards) in `app/layout.tsx`.
- `app/robots.ts` and `app/sitemap.ts` generate `/robots.txt` and
  `/sitemap.xml` automatically.
- JSON-LD `Product` + `AggregateRating` structured data on the home page.
- Semantic HTML (single `<h1>`, descriptive `alt` text on every image).

## 1. Install
```bash
npm install
```

## 2. Free Postgres database
Create a free database at [Neon](https://neon.tech) (recommended — built-in
pooling) or [Supabase](https://supabase.com).

```bash
cp .env.example .env
# edit .env: DATABASE_URL (pooled), DIRECT_URL (direct), ADMIN_SECRET, NEXT_PUBLIC_SITE_URL
npx prisma db push
npm run db:seed   # loads the 33 starter reviews into the database
```

## 3. Uploads
Logo, cover image, video, and the ebook PDF uploaded from `/admin` are
written to Supabase Storage, not the server's own disk — this works on any
host, including Vercel, since nothing is written to local disk. Set
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (see `.env.example`).

Two buckets are used, and both are created automatically on first upload:
- `SUPABASE_BUCKET` (default `uploads`) — **public**. Logo, hero image, and
  the showcase video live here and are served directly via their public URL.
- `SUPABASE_PDF_BUCKET` (default `protected-files`) — **private**. The paid
  ebook PDF lives here. There's no public URL for it at all — every
  download goes through `/api/download`, which checks that the link's
  payment succeeded and that it hasn't hit its 3-download limit, then
  streams the file back from the server. This is what keeps a paid
  download link from turning into a permanently shareable direct file URL.

## 4. Run locally
```bash
npm run dev
```
Visit `http://localhost:3000`, then `/admin` to upload your real logo,
cover image, and PDF, and to moderate reviews.

## 5. Tunable limits
- Downloads per person: `MAX_DOWNLOADS` in `app/api/download/route.ts`.
- Devices per link: `MAX_DEVICES` in `lib/tokens.ts` (default 2).
- Duplicate rule: the `OR` check in `app/api/submit/route.ts`.
- Rate limits: the `rateLimit(...)` calls throughout `app/api/*`.
- Starter reviews: edit `lib/reviewsData.ts`, then re-run `npm run db:seed`
  on a fresh database (it skips seeding if reviews already exist).

## 6. Deploy
Any Node host with a writable filesystem works. Set the same env vars, plus
a live `NEXT_PUBLIC_SITE_URL`. For multi-instance/high-traffic deployments,
also set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.

## Project structure
```
app/
  layout.tsx, robots.ts, sitemap.ts   SEO + global setup
  page.tsx                             home page (cached, JSON-LD, reviews)
  access/[token]/                      download page (3-download limit)
  admin/                                content + submissions + reviews dashboard
  api/submit/                          rate-limited, blocks duplicates
  api/download/                        rate-limited, atomic limit check
  api/reviews/                          list + create reviews
  api/reviews/[id]/                    edit/delete (owner token or admin)
  api/admin/upload/                    validated local file uploads
  api/admin/submissions/               paginated submissions list
  api/admin/export/                    streamed CSV export
components/
  Header.tsx, ProductDetails.tsx, OrderForm.tsx, TermsModal.tsx,
  DownloadButton.tsx, Reviews.tsx
lib/
  db.ts             Prisma client
  mailer.ts          Gmail SMTP sender + HTML email templates
  rateLimit.ts       in-memory / Upstash rate limiter
  adminAuth.ts        timing-safe admin auth + rate limiting
  reviewAuth.ts       hashed review edit tokens
  reviews.ts, reviewsData.ts, types.ts, product.ts, pricing.ts
prisma/
  schema.prisma      Product + Submission + Review models
  seed.ts            loads lib/reviewsData.ts into the database
```
