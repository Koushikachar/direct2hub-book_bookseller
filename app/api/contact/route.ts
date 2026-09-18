import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { sendMail, contactNotificationEmail, contactAutoReplyEmail } from "@/lib/mailer";

interface ContactBody {
  name?: string;
  email?: string;
  message?: string;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success } = await rateLimit(`contact:${ip}`, 5, 10 * 60_000); // 5 messages / 10 min / IP
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 });
  }

  try {
    const body = (await req.json()) as ContactBody;
    const { name, email, message } = body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (name.length > 100 || email.length > 150 || message.length > 3000) {
      return NextResponse.json({ error: "One of the fields is too long." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const cleanName = name.trim().slice(0, 100);
    const cleanEmail = email.trim().toLowerCase();
    const cleanMessage = message.trim().slice(0, 3000);

    const adminEmail = process.env.GMAIL_USER;
    if (adminEmail) {
      await sendMail({
        to: adminEmail,
        subject: `New contact message from ${cleanName}`,
        html: contactNotificationEmail({ name: cleanName, email: cleanEmail, message: cleanMessage }),
        replyTo: cleanEmail,
      });
      await sendMail({
        to: cleanEmail,
        subject: "We got your message — Direct2hub",
        html: contactAutoReplyEmail({ name: cleanName }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 500 });
  }
}
