// Resolves the app's public base URL (no trailing slash), used for the
// download-link email, sitemap, robots.txt, and canonical/OG tags.
//
// Priority:
// 1. NEXT_PUBLIC_SITE_URL — set this explicitly once you have a custom
//    domain, so links always point at it even from preview deployments.
// 2. VERCEL_PROJECT_PRODUCTION_URL — Vercel sets this automatically to
//    your project's stable production domain (no setup needed). This is
//    what keeps things working out of the box even if NEXT_PUBLIC_SITE_URL
//    was never added in the Vercel dashboard — previously the code fell
//    straight through to "http://localhost:3000" in that case, which is
//    why the "download your ebook" email kept linking to localhost after
//    deploying.
// 3. VERCEL_URL — the current deployment's own URL (covers preview/branch
//    deployments where PRODUCTION_URL isn't set).
// 4. http://localhost:3000 — local dev only.
export function getSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const trimmed = candidate.trim().replace(/\/$/, "");
    // Guards against a misconfigured env var (missing "https://", stray
    // whitespace, etc.) — without this, an invalid value here crashes
    // metadata generation for every page on the site instead of just
    // falling back to localhost.
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      continue;
    }
  }

  return "http://localhost:3000";
}
