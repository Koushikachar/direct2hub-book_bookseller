import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { generateInvoicePdf } from "@/lib/invoice";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  try {
    const { id } = await params;
    if (!id || typeof id !== "string" || id.length > 100) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

    if (submission.paymentStatus !== "paid") {
      return NextResponse.json({ error: "No paid invoice exists for this submission yet." }, { status: 404 });
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
    console.error("Admin invoice generation error:", err);
    return NextResponse.json({ error: "Could not generate the invoice. Please try again shortly." }, { status: 500 });
  }
}
