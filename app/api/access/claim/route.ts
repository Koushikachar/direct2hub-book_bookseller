import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { generateDeviceToken, deviceCookieName, MAX_DEVICES } from "@/lib/tokens";

// Runs whenever a paid link is opened from a browser that doesn't already
// carry a matching device cookie (see app/access/[token]/page.tsx). We
// generate a per-device secret and try to atomically append it to the
// submission's deviceTokens array, but only while there's still room
// (fewer than MAX_DEVICES claimed already) — that guard and the append
// happen in a single SQL statement so a burst of near-simultaneous
// requests (e.g. two tabs) can never push the array past the limit. If
// there's no room left, nothing is claimed and the access page shows the
// "already in use" state instead of the download.
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const token = searchParams.get("token") || "";

  if (!token) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const destination = new URL(`/access/${encodeURIComponent(token)}`, origin);

  try {
    const submission = await prisma.submission.findUnique({ where: { accessToken: token } });
    if (!submission || submission.paymentStatus !== "paid") {
      return NextResponse.redirect(destination);
    }

    // If this browser already has a valid claim cookie for this
    // submission, there's nothing to do — just go straight back.
    const cookieStore = await cookies();
    const existingCookie = cookieStore.get(deviceCookieName(submission.id))?.value;
    if (existingCookie && submission.deviceTokens.includes(existingCookie)) {
      return NextResponse.redirect(destination);
    }

    const deviceToken = generateDeviceToken();

    const claimed = await prisma.$executeRaw`
      UPDATE "Submission"
      SET "deviceTokens" = array_append("deviceTokens", ${deviceToken})
      WHERE "id" = ${submission.id}
        AND cardinality("deviceTokens") < ${MAX_DEVICES}
        AND NOT (${deviceToken} = ANY("deviceTokens"))
    `;

    const res = NextResponse.redirect(destination);
    if (claimed > 0) {
      res.cookies.set(deviceCookieName(submission.id), deviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }
    return res;
  } catch (err) {
    console.error("Access claim error:", err);
    return NextResponse.redirect(destination);
  }
}
