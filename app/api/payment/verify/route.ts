import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { timingSafeEqual } from "@/lib/adminAuth";
import { sendMail, orderConfirmationEmail } from "@/lib/mailer";
import { getSiteUrl } from "@/lib/siteUrl";
import { generateInvoicePdf, invoiceNumberFor } from "@/lib/invoice";

interface VerifyBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success } = await rateLimit(`verify-payment:${ip}`, 20, 10 * 60_000); // 20 attempts / 10 min / IP
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 });
  }

  try {
    const body = (await req.json()) as VerifyBody;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Payments aren't configured yet." }, { status: 500 });
    }

    // Confirm this callback genuinely came from Razorpay for this exact
    // order + payment pair, using the same HMAC scheme Razorpay signs
    // with — never trust the browser's word that a payment succeeded.
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (!timingSafeEqual(expectedSignature, razorpay_signature)) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
    if (!submission) {
      return NextResponse.json({ error: "No matching order found." }, { status: 404 });
    }

    if (submission.paymentStatus !== "paid") {
      const paidSubmission = await prisma.submission.update({
        where: { id: submission.id },
        data: {
          paymentStatus: "paid",
          razorpayPaymentId: razorpay_payment_id,
          paidAt: new Date(),
        },
      });

      // Best-effort confirmation email — never blocks the response, and a
      // failure here doesn't affect the (already-verified) payment status.
      // The invoice PDF is generated before the download link is ever
      // emailed out, and is both attached directly and linked so the
      // buyer can always pull it up again later.
      const siteUrl = getSiteUrl();
      const amountLabel = `₹${(paidSubmission.amountPaise / 100).toFixed(0)}`;
      const invoiceNumber = invoiceNumberFor(paidSubmission);
      const product = await prisma.product.findFirst({ orderBy: { updatedAt: "desc" } });

      generateInvoicePdf({
        submission: paidSubmission,
        productTitle: product?.title || "Direct2hub order",
        supportEmail: process.env.GMAIL_USER,
        logoUrl: product?.logoUrl,
      })
        .then((invoicePdf) =>
          sendMail({
            to: paidSubmission.email,
            subject: "Your Ecommerce Playbook is ready to download 🎉",
            html: orderConfirmationEmail({
              name: paidSubmission.name,
              accessUrl: `${siteUrl}/access/${paidSubmission.accessToken}`,
              invoiceUrl: `${siteUrl}/api/invoice/${paidSubmission.accessToken}`,
              amountLabel,
              invoiceNumber,
              logoUrl: product?.logoUrl,
            }),
            attachments: [
              {
                filename: `invoice-${invoiceNumber}.pdf`,
                content: invoicePdf,
                contentType: "application/pdf",
              },
            ],
          })
        )
        .catch((err) => console.error("Order confirmation email failed:", err));
    }

    return NextResponse.json({ ok: true, token: submission.accessToken });
  } catch (err) {
    console.error("Verify payment error:", err);
    return NextResponse.json({ error: "Could not verify your payment. If money was deducted, please contact support." }, { status: 500 });
  }
}
