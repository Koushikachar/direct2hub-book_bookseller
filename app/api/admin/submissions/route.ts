import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    // Paginated on purpose: at real scale this table can hold millions of
    // rows, so the admin UI never loads more than one page at a time.
    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.submission.count(),
    ]);

    return NextResponse.json({
      ok: true,
      submissions,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (err) {
    console.error("List submissions error:", err);
    return NextResponse.json({ error: "Could not load submissions." }, { status: 500 });
  }
}
