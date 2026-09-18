import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { getReviewsPage } from "@/lib/reviews";

const DAY_MS = 86_400_000;

// India Standard Time is a fixed UTC+5:30 all year (no DST), so a
// constant offset is exact. Every bucket below — which day/week/month a
// sale falls into, and "today" for the Today's Sales card — is computed
// in IST, the timezone the store and its customers are actually in.
// Bucketing in UTC instead (the previous behaviour) silently moved any
// sale made after 5:30pm IST into the next UTC day, which is what made
// "today's sales" and the daily chart look wrong around evenings.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toIST(d: Date): Date {
  return new Date(d.getTime() + IST_OFFSET_MS);
}

function dayKey(d: Date): string {
  return toIST(d).toISOString().slice(0, 10);
}

function startOfWeekKey(d: Date): string {
  const ist = toIST(d);
  const day = ist.getUTCDay(); // 0=Sun
  const diff = (day + 6) % 7; // days since Monday
  ist.setUTCDate(ist.getUTCDate() - diff);
  return ist.toISOString().slice(0, 10);
}

function monthKey(d: Date): string {
  const ist = toIST(d);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

// "N months before the current IST month", computed from the 1st of the
// month. Building this from day 1 (instead of subtracting months from
// today's day-of-month) avoids a real overflow bug: e.g. Aug 31 minus 6
// months via `setMonth` lands on Mar 2/3 (February doesn't have 31 days),
// which silently duplicated one month's bucket and skipped another —
// exactly the "gap between months isn't right" symptom in the 6-month
// and yearly charts.
function monthKeyAgo(monthsAgo: number): string {
  const now = toIST(new Date());
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  try {
    const since = new Date(Date.now() - 370 * DAY_MS); // last ~1 year covers every chart below

    const [paidSubmissions, totalSubmissions, reviewsPage] = await Promise.all([
      prisma.submission.findMany({
        where: { paymentStatus: "paid", paidAt: { gte: since } },
        select: { amountPaise: true, paidAt: true },
        orderBy: { paidAt: "asc" },
      }),
      prisma.submission.count(),
      getReviewsPage(1, null),
    ]);

    const totalPaidCount = await prisma.submission.count({ where: { paymentStatus: "paid" } });
    const totalRevenuePaise = await prisma.submission.aggregate({
      where: { paymentStatus: "paid" },
      _sum: { amountPaise: true },
    });

    // Bucket every paid submission by IST day, week, and month all at
    // once — each chart range below just reads however many buckets it
    // needs from the same maps.
    const dailyMap = new Map<string, { count: number; revenue: number }>();
    const weeklyMap = new Map<string, { count: number; revenue: number }>();
    const monthlyMap = new Map<string, { count: number; revenue: number }>();

    for (const sub of paidSubmissions) {
      if (!sub.paidAt) continue;
      const day = dayKey(sub.paidAt);
      const wk = startOfWeekKey(sub.paidAt);
      const mo = monthKey(sub.paidAt);

      const d = dailyMap.get(day) || { count: 0, revenue: 0 };
      d.count += 1;
      d.revenue += sub.amountPaise;
      dailyMap.set(day, d);

      const w = weeklyMap.get(wk) || { count: 0, revenue: 0 };
      w.count += 1;
      w.revenue += sub.amountPaise;
      weeklyMap.set(wk, w);

      const m = monthlyMap.get(mo) || { count: 0, revenue: 0 };
      m.count += 1;
      m.revenue += sub.amountPaise;
      monthlyMap.set(mo, m);
    }

    // Zero-filled buckets, oldest to newest, one series per chart range.
    const daily: { label: string; sales: number; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const key = dayKey(new Date(Date.now() - i * DAY_MS));
      const bucket = dailyMap.get(key) || { count: 0, revenue: 0 };
      daily.push({ label: key, sales: bucket.count, revenue: Math.round(bucket.revenue / 100) });
    }

    const weekly: { label: string; sales: number; revenue: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const key = startOfWeekKey(new Date(Date.now() - i * 7 * DAY_MS));
      const bucket = weeklyMap.get(key) || { count: 0, revenue: 0 };
      weekly.push({ label: key, sales: bucket.count, revenue: Math.round(bucket.revenue / 100) });
    }

    // "Month" — daily buckets for the last 30 days. This tab didn't
    // exist before (only Day/Week/6 Months/Year), even though the admin
    // panel's own range list implied it should.
    const monthly: { label: string; sales: number; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const key = dayKey(new Date(Date.now() - i * DAY_MS));
      const bucket = dailyMap.get(key) || { count: 0, revenue: 0 };
      monthly.push({ label: key, sales: bucket.count, revenue: Math.round(bucket.revenue / 100) });
    }

    const sixMonth: { label: string; sales: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const key = monthKeyAgo(i);
      const bucket = monthlyMap.get(key) || { count: 0, revenue: 0 };
      sixMonth.push({ label: key, sales: bucket.count, revenue: Math.round(bucket.revenue / 100) });
    }

    const yearly: { label: string; sales: number; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const key = monthKeyAgo(i);
      const bucket = monthlyMap.get(key) || { count: 0, revenue: 0 };
      yearly.push({ label: key, sales: bucket.count, revenue: Math.round(bucket.revenue / 100) });
    }

    const today = dayKey(new Date());
    const todaySales = paidSubmissions.filter((s: { paidAt: Date | null }) => s.paidAt && dayKey(s.paidAt) === today).length;

    return NextResponse.json({
      ok: true,
      totals: {
        totalSubmissions,
        totalPaid: totalPaidCount,
        totalRevenueInr: Math.round((totalRevenuePaise._sum.amountPaise || 0) / 100),
        conversionRate: totalSubmissions > 0 ? Math.round((totalPaidCount / totalSubmissions) * 1000) / 10 : 0,
        todaySales,
        averageRating: reviewsPage.summary.average,
        reviewCount: reviewsPage.summary.count,
      },
      daily,
      weekly,
      monthly,
      sixMonth,
      yearly,
      ratingBreakdown: reviewsPage.summary.breakdown,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Could not load analytics." }, { status: 500 });
  }
}
