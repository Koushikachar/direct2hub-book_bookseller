import crypto from "crypto";
import bcrypt from "bcryptjs";
import { rateLimit, getClientIp } from "./rateLimit";

export interface AdminAuthError {
  status: number;
  error: string;
}

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Checks a submitted admin password against the bcrypt hash in
 * ADMIN_PASSWORD_HASH — the real password is never stored anywhere (not in
 * env, not in the database), only its hash, so it can't be read back out
 * even if the environment or a backup leaks. Generate the hash once with:
 *   node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
 */
export async function verifyAdminPassword(provided: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH || "";
  if (!hash || !provided) return false;
  try {
    return await bcrypt.compare(provided, hash);
  } catch {
    return false;
  }
}

/**
 * Verifies the admin password against its bcrypt hash and rate-limits
 * attempts per IP, so it can't be brute-forced. Always returns the same
 * generic error regardless of *why* auth failed (missing header, wrong
 * password, missing config) so nothing about the failure reason leaks to
 * the client. Returns null when authorized.
 */
export async function requireAdmin(req: Request): Promise<AdminAuthError | null> {
  const ip = getClientIp(req);
  const { success } = await rateLimit(`admin-auth:${ip}`, 20, 60_000); // 20/min per IP
  if (!success) {
    return { status: 429, error: "Too many attempts. Please wait a minute and try again." };
  }

  const provided = req.headers.get("x-admin-secret") || "";
  const ok = await verifyAdminPassword(provided);
  if (!ok) {
    return { status: 401, error: "Unauthorized" };
  }

  return null;
}
