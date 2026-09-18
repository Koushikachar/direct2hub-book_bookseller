import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only admin client — uses the service role key, which bypasses
// Row Level Security. Never import this file from client components and
// never expose SUPABASE_SERVICE_ROLE_KEY with a NEXT_PUBLIC_ prefix.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to upload files."
    );
  }
  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }
  return cached;
}

// Logo, hero image, and the showcase video are meant to be viewed directly
// in the browser, so they live in a public bucket.
export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "uploads";

// The paid ebook PDF lives in a *private* bucket — nothing outside this
// server can read it directly. Every download goes through /api/download,
// which checks payment status and the 3-download limit before streaming
// the file back, instead of ever handing out a permanent public link.
export const SUPABASE_PDF_BUCKET = process.env.SUPABASE_PDF_BUCKET || "protected-files";

const ensuredBuckets = new Set<string>();

// Creates the bucket on first use if it doesn't exist yet, so a fresh
// Supabase project works out of the box without a manual dashboard step.
// Safe to call on every upload — it's a no-op after the first successful
// check, and tolerates a race where another request creates it first.
export async function ensureBucket(bucketName: string, isPublic: boolean): Promise<void> {
  if (ensuredBuckets.has(bucketName)) return;

  const supabase = getSupabaseAdmin();
  const { data: existing, error: getError } = await supabase.storage.getBucket(bucketName);

  if (existing) {
    // The bucket already exists — but if it was created some other way
    // (e.g. manually in the Supabase dashboard, or before this file's
    // public/private split existed) its visibility might not match what
    // this bucket is supposed to be. That's a common, easy-to-miss cause
    // of "the file uploads fine but won't load in the browser": a public
    // bucket getPublicUrl() only actually resolves if the bucket's
    // `public` flag is true — otherwise every request for it 400s, which
    // for a <video> tag just looks like "it doesn't play." Bring it in
    // line automatically instead of leaving it silently broken.
    if (existing.public !== isPublic) {
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, { public: isPublic });
      if (updateError) {
        throw new Error(`Could not update Supabase bucket "${bucketName}" visibility: ${updateError.message}`);
      }
    }
    ensuredBuckets.add(bucketName);
    return;
  }

  // Only attempt creation if the bucket genuinely wasn't found — other
  // errors (bad credentials, network) should surface, not be masked.
  if (getError && !/not.*found/i.test(getError.message)) {
    throw new Error(`Could not check Supabase bucket "${bucketName}": ${getError.message}`);
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: isPublic,
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Could not create Supabase bucket "${bucketName}": ${createError.message}`);
  }

  ensuredBuckets.add(bucketName);
}

// Mints a one-time signed URL the *browser* can upload straight to
// Supabase Storage with — no file bytes ever pass through our own Next.js
// route. This is what lets large videos (or even a 5MB image) upload at
// all on Vercel: serverless Functions there hard-cap request bodies at
// 4.5MB (a platform limit, not something app code can raise), so any
// route that receives the file itself will 413 well before hitting our
// own size checks. Routing the upload directly to Storage sidesteps that
// limit entirely; our route only ever sees the resulting URL afterwards.
export async function createSignedUpload(
  bucket: string,
  path: string
): Promise<{ signedUrl: string; token: string; path: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    throw new Error(`Could not create signed upload URL: ${error?.message || "unknown error"}`);
  }
  return data;
}

// Older rows may have stored a full public URL for pdfUrl; new uploads
// store just the storage path. This accepts either so nothing breaks for
// a product row saved before this change.
export function resolveStoragePath(value: string, bucket: string): string {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const signedMarker = `/storage/v1/object/sign/${bucket}/`;
  for (const m of [marker, signedMarker]) {
    const idx = value.indexOf(m);
    if (idx !== -1) {
      const rest = value.slice(idx + m.length);
      return decodeURIComponent(rest.split("?")[0]);
    }
  }
  return value;
}
