import { prisma } from "@/lib/db";
import { SEED_REVIEWS } from "@/lib/reviewsData";
import type { ReviewView, ReviewsSummary } from "@/lib/types";

export function summarizeRatings(ratings: number[]): ReviewsSummary {
  const count = ratings.length;
  const sum = ratings.reduce((a, b) => a + b, 0);
  const average = count ? Math.round((sum / count) * 10) / 10 : 0;
  const breakdown: ReviewsSummary["breakdown"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    const key = Math.min(5, Math.max(1, Math.round(r))) as 1 | 2 | 3 | 4 | 5;
    breakdown[key] += 1;
  }
  return { average, count, breakdown };
}

const SEEDED: ReviewView[] = SEED_REVIEWS.map((r, i) => ({
  id: `seed-${i}`,
  name: r.name,
  rating: r.rating,
  comment: r.comment,
  createdAt: new Date(Date.now() - r.daysAgo * 86_400_000).toISOString(),
}));

function seedPage(limit: number, cursor: string | null) {
  const startIndex = cursor ? SEEDED.findIndex((r) => r.id === cursor) + 1 : 0;
  const page = SEEDED.slice(startIndex, startIndex + limit);
  const nextCursor = startIndex + limit < SEEDED.length ? page[page.length - 1]?.id ?? null : null;
  return {
    reviews: page,
    summary: summarizeRatings(SEEDED.map((r) => r.rating)),
    nextCursor,
  };
}

export interface ReviewsPage {
  reviews: ReviewView[];
  summary: ReviewsSummary;
  nextCursor: string | null;
}

// Falls back to seed data whenever the table is empty or the DB isn't
// reachable yet, so the reviews section always renders something sensible.
export async function getReviewsPage(limit: number, cursor: string | null): Promise<ReviewsPage> {
  try {
    const allRatings = await prisma.review.findMany({ select: { rating: true } });
    if (allRatings.length === 0) return seedPage(limit, cursor);

    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const nextCursor = reviews.length === limit ? reviews[reviews.length - 1].id : null;

    return {
      reviews: reviews.map((r): ReviewView => ({
        id: r.id,
        name: r.name,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
      summary: summarizeRatings(allRatings.map((r: { rating: number }) => r.rating)),
      nextCursor,
    };
  } catch {
    return seedPage(limit, cursor);
  }
}
