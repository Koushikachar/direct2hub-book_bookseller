import { PrismaClient } from "@prisma/client";
import { SEED_REVIEWS } from "../lib/reviewsData";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.review.count();
  if (existing > 0) {
    console.log(`Skipping — ${existing} review(s) already in the database.`);
    return;
  }

  for (const r of SEED_REVIEWS) {
    await prisma.review.create({
      data: {
        name: r.name,
        rating: r.rating,
        comment: r.comment,
        createdAt: new Date(Date.now() - r.daysAgo * 86_400_000),
      },
    });
  }
  console.log(`Seeded ${SEED_REVIEWS.length} reviews.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
