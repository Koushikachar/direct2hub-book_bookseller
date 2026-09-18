import crypto from "crypto";

// Access tokens are unguessable link secrets (not just IDs), so they still
// need to be cryptographically random. A raw UUID like
// "cc5fb08e-8057-4e4d-8234-44b4483b0ea2" is secure but reads as noisy —
// this produces a shorter, hyphen-free, alphanumeric-only token with more
// entropy than a UUIDv4 (14 chars from a 62-symbol alphabet ≈ 83 bits vs
// UUIDv4's ~122 bits of which only ~122 are random — plenty either way),
// so it looks cleaner in a URL while staying just as unguessable.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateAccessToken(length = 14): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

// The cookie value that "claims" an access link for one device the first
// time it's opened from that device. Plenty of entropy — this only ever
// needs to be unguessable, not short or pretty (it's never shown to
// anyone).
export function generateDeviceToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

// How many distinct devices/browsers a single paid link can be claimed on
// before it's treated as shared. 2 covers the common legitimate case (open
// on your phone to confirm, then again on your laptop to actually read/
// download) while still stopping the link from being posted publicly.
// Change this single number if you'd rather allow more or fewer.
export const MAX_DEVICES = 2;

export function deviceCookieName(submissionId: string): string {
  return `d2h_dt_${submissionId}`;
}

// Turns a product title into a clean, filesystem-safe PDF filename, e.g.
// "The Ecommerce Playbook – Start, Sell & Scale Your Ecommerce Business"
// -> "The-Ecommerce-Playbook-Start-Sell-Scale-Your-Ecommerce-Business.pdf"
// instead of the random storage filename the file happens to be saved
// under internally.
export function slugifyFilename(title: string, extension = "pdf"): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "ebook"}.${extension}`;
}
