import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import type { Submission } from "@prisma/client";

const BATCH_SIZE = 1000;

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Streams a CSV in fixed-size batches using cursor pagination — this scales
// to millions of rows without ever holding the full dataset in memory
// (unlike building one big .xlsx in RAM). Excel/Google Sheets open CSV
// natively, so this is a true "download as Excel" experience at any scale.
export async function GET(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode("Name,Email,Country Code,WhatsApp Number,Payment Status,Amount Paid (INR),Downloads Used,Submitted At\n")
      );

      let cursor: string | undefined = undefined;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch: Submission[] = await prisma.submission.findMany({
          take: BATCH_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: "asc" },
        });
        if (batch.length === 0) break;

        const chunk =
          batch
            .map((s: Submission) =>
              [
                csvEscape(s.name),
                csvEscape(s.email),
                csvEscape(s.countryCode),
                csvEscape(s.whatsapp),
                csvEscape(s.paymentStatus),
                csvEscape((s.amountPaise / 100).toFixed(2)),
                csvEscape(s.downloadCount),
                csvEscape(s.createdAt.toISOString()),
              ].join(",")
            )
            .join("\n") + "\n";
        controller.enqueue(encoder.encode(chunk));

        cursor = batch[batch.length - 1].id;
        if (batch.length < BATCH_SIZE) break;
      }
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="direct2hub-submissions-${Date.now()}.csv"`,
    },
  });
}
