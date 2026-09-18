import crypto from "crypto";

// A reviewer gets a random token back exactly once, right after they submit
// a review. Only its SHA-256 hash is stored, so editing/deleting later
// requires possessing that original token (kept in the browser's
// localStorage) — nobody else, including someone reading the database
// directly, can derive it back from the hash.

export function generateEditToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function hashEditToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyEditToken(token: string, hash: string | null): boolean {
  if (!token || !hash) return false;
  const a = Buffer.from(hashEditToken(token));
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
