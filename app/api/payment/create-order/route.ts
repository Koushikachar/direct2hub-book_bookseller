import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRazorpay } from "@/lib/razorpay";
import { PRODUCT_PRICE_PAISE, CURRENCY } from "@/lib/pricing";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success } = await rateLimit(`create-order:${ip}`, 10, 10 * 60_000); // 10 attempts / 10 min / IP
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 });
  }

  try {
    const { submissionId } = (await req.json()) as { submissionId?: string };
    if (!submissionId || typeof submissionId !== "string") {
      return NextResponse.json({ error: "Missing submission." }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) {
      return NextResponse.json({ error: "Submission not found. Please fill the form again." }, { status: 404 });
    }
    if (submission.paymentStatus === "paid") {
      return NextResponse.json({ error: "This has already been paid for." }, { status: 409 });
    }

    // Amount always comes from the server's own price constant — the
    // client only ever tells us WHO is paying, never HOW MUCH.
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: PRODUCT_PRICE_PAISE,
      currency: CURRENCY,
      receipt: submission.id,
      notes: { submissionId: submission.id, email: submission.email },
    });

    await prisma.submission.update({
      where: { id: submission.id },
      data: { razorpayOrderId: order.id, amountPaise: PRODUCT_PRICE_PAISE },
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      amount: PRODUCT_PRICE_PAISE,
      currency: CURRENCY,
      keyId: process.env.RAZORPAY_KEY_ID,
      name: submission.name,
      email: submission.email,
      contact: `${submission.countryCode}${submission.whatsapp}`,
    });
  } catch (err) {
    console.error("Create order error:", err);
    const message = err instanceof Error ? err.message : "";

    let hint = "Could not start payment. Please try again.";
    if (/RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET/i.test(message)) {
      hint = "Payments aren't configured yet — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.";
    } else if (/key_id|authentication/i.test(message)) {
      hint = "Payment gateway rejected the request — check that your Razorpay keys are correct.";
    }

    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
