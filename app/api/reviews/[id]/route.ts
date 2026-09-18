import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyEditToken } from "@/lib/reviewAuth";
import { verifyAdminPassword } from "@/lib/adminAuth";
import type { ReviewView } from "@/lib/types";

async function isAdmin(req: Request): Promise<boolean> {
  const provided = req.headers.get("x-admin-secret") || "";
  return verifyAdminPassword(provided);
}

async function authorize(req: Request, editTokenFromBody: string | undefined, reviewEditTokenHash: string | null) {
  if (await isAdmin(req)) return true;
  return verifyEditToken(editTokenFromBody || "", reviewEditTokenHash);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = getClientIp(req);
  const { success } = await rateLimit(`review-edit:${ip}`, 20, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Review not found." }, { status: 404 });

    const editToken = typeof body.editToken === "string" ? body.editToken : undefined;
    const authorized = await authorize(req, editToken, existing.editTokenHash);
    if (!authorized) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const data: { name?: string; rating?: number; comment?: string } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim().slice(0, 60);
      if (!name || name.length < 2) return NextResponse.json({ error: "Please enter a name." }, { status: 400 });
      data.name = name;
    }
    if (body.rating !== undefined) {
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
      }
      data.rating = rating;
    }
    if (body.comment !== undefined) {
      const comment = String(body.comment).trim().slice(0, 600);
      if (!comment || comment.length < 5) {
        return NextResponse.json({ error: "Review must be at least 5 characters." }, { status: 400 });
      }
      data.comment = comment;
    }

    const updated = await prisma.review.update({ where: { id }, data });
    const view: ReviewView = {
      id: updated.id,
      name: updated.name,
      rating: updated.rating,
      comment: updated.comment,
      createdAt: updated.createdAt.toISOString(),
    };
    return NextResponse.json({ ok: true, review: view });
  } catch (err) {
    console.error("Review edit error:", err);
    return NextResponse.json({ error: "Could not update the review." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = getClientIp(req);
  const { success } = await rateLimit(`review-delete:${ip}`, 20, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  let editToken: string | undefined;
  try {
    const body = await req.json();
    editToken = typeof body?.editToken === "string" ? body.editToken : undefined;
  } catch {
    // No body is fine for an admin-authenticated delete.
  }

  try {
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Review not found." }, { status: 404 });

    const authorized = await authorize(req, editToken, existing.editTokenHash);
    if (!authorized) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Review delete error:", err);
    return NextResponse.json({ error: "Could not delete the review." }, { status: 500 });
  }
}
