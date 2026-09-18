import type { Metadata } from "next";
import { FaUsers, FaBoxOpen, FaAward } from "react-icons/fa";
import Nav from "@/components/Nav";
import VideoShowcase from "@/components/VideoShowcase";
import AboutGame from "@/components/AboutGame";
import { getProduct } from "@/lib/product";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Direct2Hub and the story behind The Ecommerce Playbook.",
};

const STATS = [
  { icon: FaUsers, value: "500+", label: "Sellers helped" },
  { icon: FaBoxOpen, value: "120+", label: "Product ideas inside" },
  { icon: FaAward, value: "4.7★", label: "Average rating" },
];

export default async function AboutPage() {
  const product = await getProduct();

  return (
    <div className="min-h-screen">
      <Nav logoUrl={product.logoUrl} name="Direct2hub" />

      {/* Story + video */}
      <section className="hero-glow">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div className="animate-fade-up space-y-5 text-center lg:text-left">
            <span className="inline-block rounded-full bg-ember-600/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ember-600">
              About {product.learnFrom || "Direct2Hub"}
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              Built by sellers, <span className="text-gradient">for sellers</span>
            </h1>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-brick-700/80 dark:text-cream/70">
              {product.learnFromBio ||
                "Direct2Hub is a B2B product sourcing platform for ecommerce sellers and resellers."}{" "}
              We built The Ecommerce Playbook after watching hundreds of beginners waste months guessing —
              instead of following a clear, tested path from zero to their first sale.
            </p>
            <p className="text-[15px] leading-relaxed text-brick-700/80 dark:text-cream/70">
              Every page comes from real seller experience: real supplier conversations, real pricing mistakes, and
              real launches — distilled into one 86-page playbook you can act on today.
            </p>
          </div>

          <div className="flex justify-center">
            <VideoShowcase src={product.videoUrl || "/videos/showcase.mp4"} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto -mt-4 max-w-6xl px-4 pb-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="card flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ember-600/10 text-ember-600">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-xl font-bold">{s.value}</p>
                <p className="text-sm text-brick-700/80 dark:text-cream/75">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gamified PDF preview */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="section-glow" aria-hidden />
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ember-600/20 bg-gradient-to-r from-ember-600/10 to-ember-300/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ember-600">
            ✦ Inside the playbook
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
            Peek inside <span className="text-gradient">the playbook</span>
          </h2>
          <p className="mt-3 text-brick-700/80 dark:text-cream/75">
            A little game before you buy — flip the cards below to preview 3 real chapters from the guide.
          </p>
        </div>
        <AboutGame pdfSizeKb={product.pdfSizeKb} totalPages={86} />
      </section>
    </div>
  );
}
