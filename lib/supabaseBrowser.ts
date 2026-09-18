"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client-only Supabase instance, used exclusively to push a file straight
// to Storage via a signed upload URL obtained from our own API. It only
// ever holds the *anon* key, which is meant to be public (same as any
// NEXT_PUBLIC_ variable) — the actual write permission for each upload
// comes from the one-time token in the signed URL, minted server-side
// with the service role key, which never reaches the browser.
let cached: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set (Project Settings → API → \"anon public\" key) for uploads to work."
    );
  }
  if (!cached) {
    cached = createClient(url, anonKey, { auth: { persistSession: false } });
  }
  return cached;
}
