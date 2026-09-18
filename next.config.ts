import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob: https:",
      // Showcase videos are uploaded to Supabase Storage, which is a
      // different origin from the app itself. Without media-src, CSP
      // falls back to default-src 'self' and silently blocks the <video>
      // tag from loading anything off-origin — the video looks "broken"
      // with no visible error, exactly matching "uploads fine, won't play."
      "media-src 'self' blob: https:",
      // 'unsafe-eval' is required in dev only — Next.js's hot-reload
      // (react-refresh) uses eval(), which CSP otherwise blocks. It's left
      // out in production so the built app keeps the stricter policy.
      // checkout.razorpay.com is required to load Razorpay's payment widget.
      `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com${
        process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""
      }`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      // The admin panel uploads files straight from the browser to
      // Supabase Storage (bypassing this app's server, since Vercel caps
      // serverless request bodies at ~4.5MB) — that request goes to the
      // project's own Supabase origin, not this app's, so it has to be
      // allowed here explicitly or the browser blocks it with a CSP error
      // ("Refused to connect... violates Content-Security-Policy") that
      // looks exactly like a network failure. Falls back to the wildcard
      // *.supabase.co host if NEXT_PUBLIC_SUPABASE_URL isn't set, so this
      // doesn't silently no-op in an environment missing that var.
      `connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com ${
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://*.supabase.co"
      }`,
      // Razorpay's checkout renders inside an iframe for UPI/card entry —
      // without this, the modal opens but stays blank.
      "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
