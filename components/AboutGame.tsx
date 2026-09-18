"use client";
import { useMemo, useRef, useState, type ComponentType, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { FaLock, FaCheck, FaGift, FaLightbulb, FaBoxOpen, FaCalculator, FaArrowRight, FaRedo } from "react-icons/fa";

interface Chapter {
  id: number;
  label: string;
  part: string;
  teaser: string;
  icon: ComponentType<{ className?: string }>;
  gradient: string;
  glow: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 1,
    label: "Chapter 01",
    part: "Foundations",
    teaser: "The 4 questions every winning product idea has to survive — before you spend a rupee sourcing it.",
    icon: FaLightbulb,
    gradient: "linear-gradient(135deg, #FF8A33 0%, #FF6600 55%, #CC5200 100%)",
    glow: "rgba(255,102,0,0.5)",
  },
  {
    id: 2,
    label: "Chapter 02",
    part: "Sourcing",
    teaser: "How to vet a supplier in under 10 minutes, and the 3 red flags that should make you walk away.",
    icon: FaBoxOpen,
    gradient: "linear-gradient(135deg, #FF6B4A 0%, #E8452F 55%, #B8301C 100%)",
    glow: "rgba(232,69,47,0.5)",
  },
  {
    id: 3,
    label: "Chapter 03",
    part: "Pricing & Profit",
    teaser: "The exact formula to price for Amazon, Flipkart & Meesho without quietly losing money on fees.",
    icon: FaCalculator,
    gradient: "linear-gradient(135deg, #FFA366 0%, #FF6600 55%, #A83E10 100%)",
    glow: "rgba(255,163,102,0.5)",
  },
];

interface AboutGameProps {
  pdfSizeKb?: number;
  totalPages?: number;
}

function ChapterCard({ chapter, isFlipped, onToggle }: { chapter: Chapter; isFlipped: boolean; onToggle: () => void }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const Icon = chapter.icon;

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (isFlipped) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * 14;
    const rx = (0.5 - py) * 14;
    innerRef.current?.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    innerRef.current?.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    sheenRef.current?.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    sheenRef.current?.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
  }

  function resetTilt() {
    innerRef.current?.style.setProperty("--rx", "0deg");
    innerRef.current?.style.setProperty("--ry", "0deg");
  }

  return (
    <div
      className="chapter-card-wrap"
      style={{ ["--glow-color" as string]: chapter.glow }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Preview ${chapter.label}`}
        className={`chapter-flip relative block h-80 w-full text-left focus:outline-none ${isFlipped ? "is-flipped" : ""}`}
      >
        <div ref={innerRef} className="chapter-flip-inner h-full w-full">
          {/* front */}
          <div className="chapter-face chapter-face--front" style={{ background: chapter.gradient }}>
            <span aria-hidden className="chapter-ghost-num">
              {String(chapter.id).padStart(2, "0")}
            </span>
            <span aria-hidden className="chapter-corner-fold" />
            <div ref={sheenRef} aria-hidden className="chapter-sheen" />
            <div className="relative z-[2] flex h-full flex-col justify-between p-6">
              <div className="chapter-icon-badge">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/75">{chapter.label}</p>
                <p className="mt-1 font-display text-[26px] font-extrabold leading-tight text-white">{chapter.part}</p>
                <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-white/95">
                  Tap to reveal the takeaway <FaArrowRight className="chapter-cta-arrow h-3 w-3" />
                </p>
              </div>
            </div>
          </div>

          {/* back */}
          <div className="chapter-face chapter-face--back card flex h-full flex-col justify-between p-6">
            <div>
              <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-ember-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ember-600">
                <FaCheck className="h-3 w-3" /> {chapter.label} · {chapter.part}
              </p>
              <span aria-hidden className="chapter-quote">
                &ldquo;
              </span>
              <p className="text-[15px] font-medium leading-relaxed text-brick-800 dark:text-cream/85">{chapter.teaser}</p>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-brick-700/50 dark:text-cream/40">
              <FaRedo className="h-3 w-3" /> Tap again to flip back
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}

export default function AboutGame({ pdfSizeKb = 422, totalPages = 86 }: AboutGameProps) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const unlockedCount = useMemo(() => Object.values(flipped).filter(Boolean).length, [flipped]);
  const allUnlocked = unlockedCount === CHAPTERS.length;

  function toggle(id: number) {
    setFlipped((f) => ({ ...f, [id]: !f[id] }));
  }

  return (
    <div className="space-y-10">
      {/* progress */}
      <div className="mx-auto max-w-md text-center">
        <p className="mb-2.5 text-sm font-semibold text-brick-700/80 dark:text-cream/75">
          Tap each card to preview a chapter — {unlockedCount}/{CHAPTERS.length} explored
        </p>
        <div className="flex items-center justify-center gap-2.5">
          {CHAPTERS.map((c) => (
            <span
              key={c.id}
              className={`progress-dot h-2.5 w-2.5 rounded-full ${
                flipped[c.id] ? "scale-125 bg-ember-600 shadow-[0_0_0_4px_rgba(255,102,0,0.18)]" : "bg-brick-700/20 dark:bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>

      {/* flip cards — fully code-built glossy gradient fronts with a
          cursor-tracked tilt + sheen highlight, instead of a flat
          uploaded screenshot. */}
      <div className="grid grid-cols-1 gap-7 sm:grid-cols-3">
        {CHAPTERS.map((chapter) => (
          <ChapterCard key={chapter.id} chapter={chapter} isFlipped={!!flipped[chapter.id]} onToggle={() => toggle(chapter.id)} />
        ))}
      </div>

      {/* locked full playbook reveal */}
      <div
        className={`card relative mx-auto max-w-xl overflow-hidden p-6 text-center transition-all duration-500 sm:p-8 ${
          allUnlocked ? "game-glow" : ""
        }`}
      >
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-ember-600/10 text-ember-600">
          {allUnlocked ? <FaGift className="h-6 w-6" /> : <FaLock className="h-6 w-6" />}
        </div>
        {allUnlocked ? (
          <>
            <h3 className="font-display text-xl font-bold text-ember-600">You've unlocked the preview 🎉</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-brick-700/75 dark:text-cream/65">
              That's just 3 of {totalPages} pages. The full playbook ({Math.round(pdfSizeKb / 1024) || 1}MB+) has the
              complete product list, calculator, and launch plan waiting inside.
            </p>
          </>
        ) : (
          <>
            <h3 className="font-display text-xl font-bold">{CHAPTERS.length - unlockedCount} more chapter(s) to preview</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-brick-700/80 dark:text-cream/75">
              Explore every card above to see what's really inside the {totalPages}-page playbook.
            </p>
          </>
        )}
        <Link
          href="/price"
          className="mt-5 inline-block rounded-full bg-ember-600 px-7 py-3 font-semibold text-white shadow-lg shadow-ember-600/30 transition hover:-translate-y-0.5 hover:bg-ember-500"
        >
          Unlock the full playbook — ₹199
        </Link>
      </div>
    </div>
  );
}
