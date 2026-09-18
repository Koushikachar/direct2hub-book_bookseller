import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdmin } from "@/lib/adminAuth";
import {
  ensureBucket,
  createSignedUpload,
  getSupabaseAdmin,
  SUPABASE_BUCKET,
  SUPABASE_PDF_BUCKET,
} from "@/lib/supabase";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500MB
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const EXT_CONTENT_TYPE: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

const KIND_CONFIG = {
  logo: { prefix: "logo", bucket: SUPABASE_BUCKET, public: true, maxBytes: MAX_IMAGE_BYTES, allowed: ALLOWED_IMAGE_TYPES, label: "Logo" },
  hero: { prefix: "hero", bucket: SUPABASE_BUCKET, public: true, maxBytes: MAX_IMAGE_BYTES, allowed: ALLOWED_IMAGE_TYPES, label: "Hero image" },
  preview1: { prefix: "preview1", bucket: SUPABASE_BUCKET, public: true, maxBytes: MAX_IMAGE_BYTES, allowed: ALLOWED_IMAGE_TYPES, label: "Chapter 1 preview image" },
  preview2: { prefix: "preview2", bucket: SUPABASE_BUCKET, public: true, maxBytes: MAX_IMAGE_BYTES, allowed: ALLOWED_IMAGE_TYPES, label: "Chapter 2 preview image" },
  preview3: { prefix: "preview3", bucket: SUPABASE_BUCKET, public: true, maxBytes: MAX_IMAGE_BYTES, allowed: ALLOWED_IMAGE_TYPES, label: "Chapter 3 preview image" },
  video: { prefix: "video", bucket: SUPABASE_BUCKET, public: true, maxBytes: MAX_VIDEO_BYTES, allowed: ALLOWED_VIDEO_TYPES, label: "Video" },
  pdf: { prefix: "ebook", bucket: SUPABASE_PDF_BUCKET, public: false, maxBytes: MAX_PDF_BYTES, allowed: new Set(["application/pdf"]), label: "Ebook PDF" },
} as const;

type Kind = keyof typeof KIND_CONFIG;

function extOf(originalName: string): string {
  const match = /\.[a-zA-Z0-9]+$/.exec(originalName || "");
  return match ? match[0].toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
}

function resolveContentType(contentType: string, filename: string): string {
  if (contentType) return contentType;
  return EXT_CONTENT_TYPE[extOf(filename)] || "application/octet-stream";
}

export async function POST(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  let body: { kind?: string; filename?: string; contentType?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const config = KIND_CONFIG[body.kind as Kind];
  if (!config) {
    return NextResponse.json({ error: "Unknown upload type." }, { status: 400 });
  }

  const contentType = resolveContentType(body.contentType || "", body.filename || "");
  if (!config.allowed.has(contentType)) {
    return NextResponse.json({ error: `${config.label}: unsupported file type.` }, { status: 400 });
  }

  const size = Number(body.size) || 0;
  if (size <= 0) {
    return NextResponse.json({ error: `${config.label}: file is empty.` }, { status: 400 });
  }
  if (size > config.maxBytes) {
    const maxMb = Math.round(config.maxBytes / (1024 * 1024));
    return NextResponse.json({ error: `${config.label} is too large (max ${maxMb}MB).` }, { status: 400 });
  }

  try {
    await ensureBucket(config.bucket, config.public);
    const filename = `${config.prefix}-${crypto.randomUUID()}${extOf(body.filename || "")}`;
    const signed = await createSignedUpload(config.bucket, filename);

    let publicUrl: string | null = null;
    if (config.public) {
      const supabase = getSupabaseAdmin();
      publicUrl = supabase.storage.from(config.bucket).getPublicUrl(filename).data.publicUrl;
    }

    return NextResponse.json({
      ok: true,
      bucket: config.bucket,
      path: filename,
      token: signed.token,
      signedUrl: signed.signedUrl,
      publicUrl,
      contentType,
    });
  } catch (err) {
    console.error("Admin upload-sign error:", err);
    const message = err instanceof Error ? err.message : "";

    let hint = "Could not prepare the upload. Check the server logs for details.";
    if (/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/i.test(message)) {
      hint = "Supabase Storage isn't configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.";
    } else if (/Supabase upload failed|Could not (check|create) Supabase bucket|Could not create signed upload URL/i.test(message)) {
      hint = `${message} Check that the service role key is correct and has Storage access.`;
    }

    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
