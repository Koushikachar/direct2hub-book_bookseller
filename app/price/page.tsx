import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ProductDetails from "@/components/ProductDetails";
import OrderForm from "@/components/OrderForm";
import Reviews from "@/components/Reviews";
import { getProduct } from "@/lib/product";
import { getReviewsPage } from "@/lib/reviews";

const REVIEWS_PAGE_SIZE = 8;

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Pricing",
  description: "Get instant access to The Ecommerce Playbook for a one-time ₹199 — secure checkout via Razorpay.",
};

export default async function PricePage() {
  const [product, reviewsPage] = await Promise.all([getProduct(), getReviewsPage(REVIEWS_PAGE_SIZE, null)]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.about?.slice(0, 300),
    image: product.heroImageUrl,
    brand: { "@type": "Brand", name: "Direct2Hub" },
    ...(reviewsPage.summary.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: reviewsPage.summary.average,
        reviewCount: reviewsPage.summary.count,
      },
    }),
  };

  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav logoUrl={product.logoUrl} name="Direct2hub" />

      <div className="hero-glow border-b border-black/5 py-10 text-center dark:border-white/10">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Simple, one-time pricing</h1>
        <p className="mx-auto mt-2 max-w-lg px-4 text-brick-700/80 dark:text-cream/75">
          No subscriptions. Pay once, get lifetime access to the playbook and every future update.
        </p>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start lg:gap-8">
          <div className="lg:col-span-3">
            <ProductDetails product={product} />
          </div>
          <div className="lg:sticky lg:top-24 lg:col-span-2">
            <OrderForm />
          </div>
        </div>

        <Reviews
          initialReviews={reviewsPage.reviews}
          initialSummary={reviewsPage.summary}
          initialCursor={reviewsPage.nextCursor}
        />
      </main>
    </div>
  );
}
