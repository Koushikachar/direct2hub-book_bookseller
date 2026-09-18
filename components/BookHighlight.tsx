import Link from "next/link";
import { FaLock, FaStar, FaBookOpen } from "react-icons/fa";
import ScrollReveal from "./ScrollReveal";
import Book3D from "./Book3D";

// Real chapter 1–3 highlights, pulled straight from the actual PDF (The
// Ecommerce Playbook has 16 chapters in 8 parts) — not placeholder copy.
const PREVIEW_CHAPTERS = [
  {
    number: 1,
    title: "Ecommerce Explained Simply",
    points: [
      "The real 7-step flow behind every online sale",
      "7 beginner misconceptions that quietly kill margins",
      "The \u201cseller mindset\u201d questions to ask before you list anything",
    ],
  },
  {
    number: 2,
    title: "Choose the Right Business Model",
    points: [
      "Marketplace vs D2C vs dropshipping vs private label, compared side by side",
      "Direct2Hub's exact starting-model recommendation for beginners",
      "A simple decision tree to pick your model in minutes",
    ],
  },
  {
    number: 3,
    title: "Budget, Equipment & Setup",
    points: [
      "Real starter budgets for \u20b95,000 / \u20b910,000 / \u20b915,000",
      "5 places beginners waste money \u2014 and how to avoid them",
      "The exact documents and basic tools you actually need",
    ],
  },
];

// Titles only for the locked/remaining chapters — enough to show there's
// real substance behind the paywall without giving away the content.
const LOCKED_CHAPTERS = [
  "What Makes a Good Ecommerce Product?",
  "How to Find and Validate Product Ideas",
  "Product Sourcing & Where to Find Products",
  "Supplier Negotiation & Sourcing Through Direct2Hub",
  "Pricing, Profit & Unit Economics",
  "Turn an Ordinary Product Into a Better Offer",
  "Marketplaces, Listings & Product Photography",
  "Get Your First 10 Sales With Organic Marketing",
  "Paid Advertising: Learn It, But Don't Start Here",
  "Packaging, Shipping, Returns & Inventory",
  "When to Scale, Build a Brand & Expand",
  "The Numbers Dashboard & 20 Mistakes to Avoid",
  "The 30-Day Ecommerce Launch Plan",
];

export default function BookHighlight({
  reviewCount,
  reviewAverage,
}: {
  reviewCount: number;
  reviewAverage: number;
}) {
  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
      <div className="section-glow" aria-hidden />
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* 3D book — real drag-rotatable 6-face CSS cube, see Book3D.tsx */}
        <div className="flex justify-center lg:justify-start">
          <Book3D />
        </div>

        {/* Copy + chapter highlights */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-ember-600/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ember-600">
              <FaBookOpen className="h-3 w-3" /> Peek inside the playbook
            </span>
            {reviewCount > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-ember-600/20 bg-white px-3 py-1.5 text-xs font-semibold text-brick-800 shadow-sm dark:bg-white/5 dark:text-cream/80">
                <span className="flex text-ember-500">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FaStar key={i} className={i <= Math.round(reviewAverage) ? "" : "text-brick-700/15"} />
                  ))}
                </span>
                {reviewAverage.toFixed(1)} · {reviewCount} real review{reviewCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            16 chapters. One clear path from <span className="text-gradient">idea to first sale</span>.
          </h2>
          <p className="mt-3 max-w-xl text-brick-700/75 dark:text-cream/65">
            Here&apos;s exactly what the first 3 chapters cover — real pages, no fluff.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-stretch">
            {PREVIEW_CHAPTERS.map((c, i) => (
              <ScrollReveal key={c.number} delayMs={i * 120} className="h-full">
                <div className="card group relative flex h-full flex-col overflow-hidden p-5 transition-shadow duration-300 hover:shadow-2xl">
                  <div
                    className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.10] transition-opacity duration-300 group-hover:opacity-[0.18] dark:opacity-[0.07] dark:group-hover:opacity-[0.14]"
                    style={{ background: "#FF6600" }}
                    aria-hidden
                  />
                  <div className="mb-3.5 flex items-center gap-3">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white shadow-md"
                      style={{ background: "linear-gradient(145deg, #FF8533, #FF6600)", boxShadow: "0 6px 16px -4px rgba(255,102,0,0.55)" }}
                    >
                      {c.number}
                    </span>
                    <h3 className="font-display text-base font-extrabold leading-snug tracking-tight text-brick-950 dark:text-cream">
                      {c.title}
                    </h3>
                  </div>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-brick-800/80 dark:text-cream/70">
                    {c.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#FF6600" }} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Locked remaining chapters */}
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-dashed border-ember-600/30 bg-ember-600/[0.04] p-5">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-brick-700/50 blur-[2px] dark:text-cream/40">
              {LOCKED_CHAPTERS.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brick-950 px-3 py-1 text-xs font-semibold text-white dark:bg-white/10">
                <FaLock className="h-3 w-3" /> 13 more chapters + 120 product ideas
              </span>
              <Link
                href="/price"
                className="rounded-full bg-ember-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-ember-600/30 transition hover:-translate-y-0.5 hover:bg-ember-500"
              >
                Unlock the full playbook — ₹199
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
