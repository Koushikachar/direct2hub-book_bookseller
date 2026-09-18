import Razorpay from "razorpay";

// Server-only — RAZORPAY_KEY_SECRET must never reach the browser.
// Swapping from test to live payments later needs no code changes at all:
// just replace RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (and
// NEXT_PUBLIC_RAZORPAY_KEY_ID) with your live-mode keys from the Razorpay
// dashboard. Test keys start with "rzp_test_", live keys with "rzp_live_".
let cached: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set to accept payments.");
  }
  if (!cached) {
    cached = new Razorpay({ key_id, key_secret });
  }
  return cached;
}
