import Link from "next/link";
import Image from "next/image";
import { FaRegLightbulb, FaCalculator, FaCalendarAlt, FaShieldAlt, FaStar, FaCheckCircle } from "react-icons/fa";
import Nav from "@/components/Nav";
import VideoShowcase from "@/components/VideoShowcase";
import MediaReveal from "@/components/MediaReveal";
import ScrollReveal from "@/components/ScrollReveal";
import BookHighlight from "@/components/BookHighlight";
import RecentActivity from "@/components/RecentActivity";
import FeatureCarousel from "@/components/FeatureCarousel";
import { getProduct } from "@/lib/product";
import { getReviewsPage } from "@/lib/reviews";

export const revalidate = 60;

const FEATURES = [
  {
    icon: FaRegLightbulb,
    iconKey: "lightbulb" as const,
    title: "120+ Winning Product Ideas",
    text: "Skip months of guesswork with a curated list of products that are already proven to sell.",
  },
  {
    icon: FaCalculator,
    iconKey: "calculator" as const,
    title: "Profit & Pricing Calculator",
    text: "Know your margins before you spend a rupee — sourcing cost, fees, and profit, worked out for you.",
  },
  {
    icon: FaCalendarAlt,
    iconKey: "calendar" as const,
    title: "30-Day Launch Plan",
    text: "A day-by-day roadmap to go from zero to your first sale on Amazon, Flipkart & Meesho.",
  },
  {
    icon: FaShieldAlt,
    iconKey: "shield" as const,
    title: "Beginner-Safe & Practical",
    text: "No fluff, no theory-only chapters — every page is built around what to actually do next.",
  },
];

export default async function HomePage() {
  const [product, reviewsPage] = await Promise.all([getProduct(), getReviewsPage(1, null)]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav logoUrl={product.logoUrl} name="Direct2hub" />

      <main>
      <BookHighlight reviewCount={reviewsPage.summary.count} reviewAverage={reviewsPage.summary.average} />

      {/* HERO */}
      <section className="hero-glow relative">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div className="animate-fade-up space-y-6 text-center lg:text-left">
            {reviewsPage.summary.count > 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-ember-600/20 bg-ember-600/10 px-4 py-2 text-sm font-semibold text-ember-600">
                <span className="flex text-ember-500">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FaStar key={i} className={i <= Math.round(reviewsPage.summary.average) ? "" : "text-ember-600/20"} />
                  ))}
                </span>
                {reviewsPage.summary.average.toFixed(1)} · {reviewsPage.summary.count} real review
                {reviewsPage.summary.count === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-ember-600/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ember-600">
                <FaCheckCircle className="h-3 w-3" /> Just launched — be one of the first
              </span>
            )}
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Start, sell &amp; <span className="text-gradient">scale</span> your ecommerce business
            </h1>
            <p className="mx-auto max-w-xl text-lg text-brick-700/80 dark:text-cream/70 lg:mx-0">
              {product.tagline ||
                "A practical, beginner-friendly playbook with product ideas, pricing math, and a 30-day launch plan — everything you need to get your first sale."}
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/price"
                className="cta-glow w-full rounded-full bg-ember-600 px-8 py-3.5 text-center font-semibold text-white transition hover:-translate-y-0.5 hover:bg-ember-500 sm:w-auto"
              >
                Get the Playbook — ₹199
              </Link>
              <Link
                href="/about"
                className="w-full rounded-full border border-brick-700/20 px-8 py-3.5 text-center font-semibold text-brick-800 transition hover:bg-brick-950/5 dark:border-white/20 dark:text-cream dark:hover:bg-white/10 sm:w-auto"
              >
                Watch the story
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-sm text-brick-700/80 dark:text-cream/75 lg:justify-start">
              <span className="flex items-center gap-1.5"><FaCheckCircle className="text-ember-500" /> Instant access</span>
              <span className="flex items-center gap-1.5"><FaCheckCircle className="text-ember-500" /> 86-page playbook</span>
              <span className="flex items-center gap-1.5"><FaCheckCircle className="text-ember-500" /> One-time payment</span>
            </div>
          </div>

          <div className="float-stage animate-float relative flex justify-center">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-ember-500/20 via-transparent to-transparent blur-2xl" />
            <MediaReveal>
              <VideoShowcase src={product.videoUrl || "/videos/showcase.mp4"} />
            </MediaReveal>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Everything you need, nothing you don&apos;t</h2>
          <p className="mt-3 text-brick-700/80 dark:text-cream/75">
            Built for people starting from zero — no prior ecommerce experience required.
          </p>
        </div>
        <FeatureCarousel
          features={FEATURES.map(({ iconKey, title, text }) => ({ iconKey, title, text }))}
        />
        <div className="hidden grid-cols-1 gap-5 sm:grid sm:grid-cols-2 sm:items-stretch lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delayMs={i * 90} allBreakpoints className="h-full">
              <div className="card group flex h-full flex-col p-6 transition hover:-translate-y-1 hover:shadow-2xl">
                <div className="mb-4 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ember-600/10 text-ember-600 transition group-hover:scale-110 group-hover:bg-ember-600 group-hover:text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 font-display text-base font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-brick-700/75 dark:text-cream/75">{f.text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* PRODUCT PREVIEW STRIP */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <ScrollReveal allBreakpoints>
          <div className="card grid grid-cols-1 items-center gap-6 overflow-hidden p-6 transition hover:shadow-2xl sm:grid-cols-[auto_1fr_auto] sm:p-8">
            <div className="relative mx-auto h-28 w-44 shrink-0 overflow-hidden rounded-xl shadow-md transition-transform duration-300 hover:scale-105 sm:mx-0">
              <Image src={product.heroImageUrl} alt={product.title} fill sizes="176px" className="object-cover" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-display text-xl font-bold">{product.title}</h3>
              <p className="mt-1 text-sm text-brick-700/80 dark:text-cream/75">
                By {product.learnFrom} · {reviewsPage.summary.count > 0 ? `${reviewsPage.summary.count}+ happy buyers` : "New & growing"}
              </p>
            </div>
            <Link
              href="/price"
              className="whitespace-nowrap rounded-full bg-ember-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-ember-500"
            >
              See pricing →
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* CTA BANNER */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <ScrollReveal allBreakpoints>
          <div className="hero-glow card relative overflow-hidden p-10 text-center sm:p-14">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to launch your <span className="text-gradient">first store</span>?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brick-700/75 dark:text-cream/65">
              {reviewsPage.summary.count > 0
                ? `Join ${reviewsPage.summary.count} sellers who used this exact playbook to go from idea to their first sale.`
                : "Use this exact playbook to go from idea to your first sale."}
            </p>
            <Link
              href="/price"
              className="cta-glow mt-6 inline-block rounded-full bg-ember-600 px-8 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-ember-500"
            >
              Get instant access — ₹199
            </Link>
          </div>
        </ScrollReveal>
      </section>
      </main>

      <footer className="border-t border-black/5 px-4 py-8 text-center text-sm text-brick-700/80 dark:border-white/10 dark:text-cream/70">
        © {new Date().getFullYear()} {product.learnFrom || "Direct2hub"}. All rights reserved.
      </footer>

      <RecentActivity />
    </div>
  );
}
