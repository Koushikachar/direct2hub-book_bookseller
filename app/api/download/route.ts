import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getSupabaseAdmin, resolveStoragePath, SUPABASE_PDF_BUCKET } from "@/lib/supabase";
import { slugifyFilename, deviceCookieName } from "@/lib/tokens";

const MAX_DOWNLOADS = 3;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success } = await rateLimit(`download:${ip}`, 30, 60_000); // 30/min/IP
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please slow down and try again." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { token } = body as { token?: string };
    if (!token || typeof token !== "string" || token.length > 100) {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({ where: { accessToken: token } });
    if (!submission) return NextResponse.json({ error: "Invalid link." }, { status: 404 });

    if (submission.paymentStatus !== "paid") {
      return NextResponse.json({ error: "Payment not completed for this link." }, { status: 403 });
    }

    // Defense in depth: the access page already blocks any device beyond
    // the claimed set, but that's just a page-level check — without this,
    // someone could still hit this API directly with just the token and
    // download the file straight through.
    if (submission.deviceTokens.length > 0) {
      const cookieStore = await cookies();
      const deviceCookie = cookieStore.get(deviceCookieName(submission.id))?.value;
      if (!deviceCookie || !submission.deviceTokens.includes(deviceCookie)) {
        return NextResponse.json(
          { error: "This link isn't claimed on this device." },
          { status: 403 }
        );
      }
    }

    if (submission.downloadCount >= MAX_DOWNLOADS) {
      return NextResponse.json(
        { error: "You've reached the maximum download limit. You can't download this file anymore.", limitReached: true, remaining: 0 },
        { status: 403 }
      );
    }

    const product = await prisma.product.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!product?.pdfUrl) {
      return NextResponse.json({ error: "The file isn't available yet. Please check back soon." }, { status: 404 });
    }

    // Atomic conditional update — guards against a burst of parallel
    // requests from the same link ever pushing the count past the limit.
    const updated = await prisma.submission.updateMany({
      where: { id: submission.id, downloadCount: { lt: MAX_DOWNLOADS } },
      data: { downloadCount: { increment: 1 } },
    });
    if (updated.count === 0) {
      return NextResponse.json(
        { error: "You've reached the maximum download limit. You can't download this file anymore.", limitReached: true, remaining: 0 },
        { status: 403 }
      );
    }

    const fresh = await prisma.submission.findUnique({ where: { id: submission.id } });
    const remaining = Math.max(0, MAX_DOWNLOADS - (fresh?.downloadCount ?? MAX_DOWNLOADS));

    // Fetch the file server-side (service role bypasses the bucket's
    // privacy) and stream the bytes straight back in this response. We
    // never hand the client a Supabase URL — there's no separate,
    // permanent, shareable link to leak. The browser gets the file from
    // our own origin with Content-Disposition: attachment, which is what
    // makes it actually start downloading instead of opening/navigating
    // somewhere, and we control the filename it saves as.
    const path = resolveStoragePath(product.pdfUrl, SUPABASE_PDF_BUCKET);
    const supabase = getSupabaseAdmin();
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(SUPABASE_PDF_BUCKET)
      .download(path);

    if (downloadError || !fileBlob) {
      console.error("PDF fetch error:", downloadError?.message);
      return NextResponse.json({ error: "The file couldn't be retrieved. Please try again shortly." }, { status: 502 });
    }

    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const filename = slugifyFilename(product.title || "ebook");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "no-store",
        "X-Remaining": String(remaining),
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
