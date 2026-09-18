import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { generateInvoicePdf } from "@/lib/invoice";

// Deliberately NOT device-locked like /api/download — the invoice isn't
// the paid product itself, and a buyer should be able to pull it up on any
// device (accounting, taxes, expense claims, etc.) as long as they have the
// unguessable access token. It's still rate-limited and only ever served
// for a submission whose payment has actually gone through.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  const { success } = await rateLimit(`invoice:${ip}`, 20, 60_000); // 20/min/IP
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please slow down and try again." }, { status: 429 });
  }

  try {
    const { token } = await params;
    if (!token || typeof token !== "string" || token.length > 100) {
      return NextResponse.json({ error: "Invalid link." }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({ where: { accessToken: token } });
    if (!submission) return NextResponse.json({ error: "Invalid link." }, { status: 404 });

    if (submission.paymentStatus !== "paid") {
      return NextResponse.json({ error: "Payment not completed for this link." }, { status: 403 });
    }

    const product = await prisma.product.findFirst({ orderBy: { updatedAt: "desc" } });
    const pdf = await generateInvoicePdf({
      submission,
      productTitle: product?.title || "Direct2hub order",
      supportEmail: process.env.GMAIL_USER,
      logoUrl: product?.logoUrl,
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${submission.id}.pdf"`,
        "Content-Length": String(pdf.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Invoice generation error:", err);
    return NextResponse.json({ error: "Could not generate the invoice. Please try again shortly." }, { status: 500 });
  }
}
