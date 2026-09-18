import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

// By the time a request reaches this route, every file has already been
// uploaded straight to Supabase Storage by the browser (see
// /api/admin/upload/sign) — this route only ever receives small JSON:
// text fields plus the resulting URLs. That's what keeps it under
// Vercel's ~4.5MB serverless request-body limit no matter how large the
// video or PDF is; previously the whole multipart file upload went
// through here and hit that platform limit (413 FUNCTION_PAYLOAD_TOO_LARGE)
// even for a 5MB image.
const TEXT_FIELDS = [
  "title",
  "tagline",
  "about",
  "learnFrom",
  "learnFromBio",
  "contactPhone",
  "whatsappUrl",
  "youtubeUrl",
  "instagramUrl",
] as const;

const MEDIA_URL_FIELDS = [
  "logoUrl",
  "heroImageUrl",
  "videoUrl",
  "pdfUrl",
  "previewImage1Url",
  "previewImage2Url",
  "previewImage3Url",
] as const;

export async function POST(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const fields: Record<string, string | number> = {};

    for (const key of TEXT_FIELDS) {
      const value = body[key];
      if (typeof value === "string" && value.length > 0) fields[key] = value;
    }
    for (const key of MEDIA_URL_FIELDS) {
      const value = body[key];
      if (typeof value === "string" && value.length > 0) fields[key] = value;
    }
    if (typeof body.pdfSizeKb === "number" && body.pdfSizeKb > 0) {
      fields.pdfSizeKb = Math.round(body.pdfSizeKb);
    }

    const existing = await prisma.product.findFirst();
    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data: fields })
      : await prisma.product.create({ data: fields });

    return NextResponse.json({ ok: true, product });
  } catch (err) {
    console.error("Admin upload error:", err);
    const message = err instanceof Error ? err.message : "";

    let hint = "Save failed. Check the server logs for details.";
    if (/does not exist|relation .* not found|P2021|P1001/i.test(message)) {
      hint = "Database isn't set up yet — run `npx prisma db push` against your DATABASE_URL, or double-check DATABASE_URL/DIRECT_URL are set.";
    }

    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
