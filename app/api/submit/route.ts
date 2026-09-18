import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { generateAccessToken } from "@/lib/tokens";

interface SubmitBody {
  name?: string;
  email?: string;
  countryCode?: string;
  whatsapp?: string;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success } = await rateLimit(`submit:${ip}`, 5, 10 * 60_000); // 5 submissions / 10 min / IP
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 });
  }

  try {
    const body = (await req.json()) as SubmitBody;
    const { name, email, countryCode, whatsapp } = body;

    if (!name?.trim() || !email?.trim() || !whatsapp?.trim() || !countryCode?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (name.length > 100 || email.length > 150 || whatsapp.length > 20 || countryCode.length > 6) {
      return NextResponse.json({ error: "One of the fields is too long." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!/^\d{4,15}$/.test(whatsapp)) {
      return NextResponse.json({ error: "Enter a valid WhatsApp number." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = name.trim().slice(0, 100);

    // Same email or same WhatsApp number can only claim the file once —
    // but only once PAID. If a previous attempt never completed payment,
    // let them pick up where they left off instead of being locked out.
    const existing = await prisma.submission.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { AND: [{ countryCode }, { whatsapp }] }],
      },
    });

    if (existing) {
      if (existing.paymentStatus === "paid") {
        return NextResponse.json(
          { error: "This email or WhatsApp number has already been used to get this file. Each person can only request it once." },
          { status: 409 }
        );
      }
      return NextResponse.json({
        ok: true,
        submissionId: existing.id,
        name: existing.name,
        email: existing.email,
        countryCode: existing.countryCode,
        whatsapp: existing.whatsapp,
      });
    }

    // Token is created now but doesn't unlock anything yet — the access
    // page checks paymentStatus and only reveals the download once paid.
    const accessToken = generateAccessToken();

    const submission = await prisma.submission.create({
      data: { name: cleanName, email: normalizedEmail, countryCode, whatsapp, accessToken },
    });

    return NextResponse.json({
      ok: true,
      submissionId: submission.id,
      name: submission.name,
      email: submission.email,
      countryCode: submission.countryCode,
      whatsapp: submission.whatsapp,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "This email or WhatsApp number has already been used to get this file. Each person can only request it once." },
        { status: 409 }
      );
    }
    console.error("Submit error:", err);
    return NextResponse.json({ error: "Could not process your request. Please try again." }, { status: 500 });
  }
}
