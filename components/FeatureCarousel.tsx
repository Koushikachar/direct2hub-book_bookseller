"use client";
import { useEffect, useRef, useState } from "react";
import { FaRegLightbulb, FaCalculator, FaCalendarAlt, FaShieldAlt } from "react-icons/fa";

// The icon components are resolved here, inside the client component,
// instead of being passed in as props from the server-rendered page —
// React can't serialize a function reference across the server/client
// boundary ("Functions cannot be passed directly to Client Components"),
// so the page only hands this component a string key per feature.
const ICONS = {
  lightbulb: FaRegLightbulb,
  calculator: FaCalculator,
  calendar: FaCalendarAlt,
  shield: FaShieldAlt,
} as const;

export type FeatureIconKey = keyof typeof ICONS;

interface Feature {
  iconKey: FeatureIconKey;
  title: string;
  text: string;
}

const AUTO_ADVANCE_MS = 5000;
// How long a manual swipe/tap pauses the auto-advance before it resumes.
const RESUME_AFTER_MS = 6000;
const TRANSITION_MS = 600;

// A true circular ring carousel (mobile only): the track is rendered with
// one extra clone of the first card appended after the last. Advancing
// past the real last card slides smoothly onto that clone, then — once
// the slide finishes — the index snaps back to the real first card with
// the transition switched off for one frame, which is invisible because
// the clone and the real first card are pixel-identical. The result is
// a loop that always goes last -> first in the same direction, never a
// snap-back the other way.
export default function FeatureCarousel({ features }: { features: Feature[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0); // can go up to features.length (the clone)
  const [withTransition, setWithTransition] = useState(true);
  const pausedUntil = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const count = features.length;
  const extended = [...features, features[0]];

  const goNext = () => {
    setWithTransition(true);
    setIndex((i) => i + 1);
  };

  const goTo = (i: number) => {
    setWithTransition(true);
    setIndex(i);
    pausedUntil.current = Date.now() + RESUME_AFTER_MS;
  };

  // Auto-advance every 5s, wrapping via the clone trick above.
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      goNext();
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, []);

  // After sliding onto the cloned first card, jump back to the real one
  // with no transition so the loop reads as continuous.
  useEffect(() => {
    if (index !== count) return;
    const t = setTimeout(() => {
      setWithTransition(false);
      setIndex(0);
    }, TRANSITION_MS);
    return () => clearTimeout(t);
  }, [index, count]);

  // Re-enable the transition on the next frame after a silent reset.
  useEffect(() => {
    if (withTransition) return;
    const raf = requestAnimationFrame(() => setWithTransition(true));
    return () => cancelAnimationFrame(raf);
  }, [withTransition]);

  const activeDot = ((index % count) + count) % count;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    pausedUntil.current = Date.now() + RESUME_AFTER_MS;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 35) return;
    if (delta < 0) {
      goNext();
    } else {
      setWithTransition(true);
      setIndex((i) => (i === 0 ? count - 1 : i - 1));
    }
  };

  return (
    <div className="sm:hidden">
      <div
        className="relative overflow-hidden rounded-3xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          ref={trackRef}
          className="circular-carousel-track"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transitionDuration: withTransition ? `${TRANSITION_MS}ms` : "0ms",
          }}
        >
          {extended.map((f, i) => {
            const Icon = ICONS[f.iconKey];
            return (
              <div key={`${f.title}-${i}`} className="w-full shrink-0 px-1.5">
                <div className="card relative overflow-hidden p-6">
                  <div
                    className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.10] dark:opacity-[0.08]"
                    style={{ background: "#FF6600" }}
                    aria-hidden
                  />
                  <div
                    className="mb-4 grid h-12 w-12 place-items-center rounded-xl text-white shadow-md"
                    style={{ background: "linear-gradient(145deg, #FF8533, #FF6600)", boxShadow: "0 8px 18px -4px rgba(255,102,0,0.5)" }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1.5 font-display text-lg font-extrabold tracking-tight">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-brick-700/75 dark:text-cream/75">{f.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-1">
        {features.map((f, i) => (
          <button
            key={f.title}
            type="button"
            aria-label={`Go to ${f.title}`}
            onClick={() => goTo(i)}
            className="grid h-11 w-11 place-items-center"
          >
            <span
              className="circular-carousel-dot block h-1.5 rounded-full"
              style={{
                width: i === activeDot ? "20px" : "6px",
                background: i === activeDot ? "#FF6600" : "rgba(255,102,0,0.25)",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
