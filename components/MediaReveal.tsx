"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Mobile-only entrance effect for the hero media (video/image): rises into
// place with a soft scale + a single shimmer sweep across it once it
// scrolls into view. Scoped to mobile via the .media-reveal CSS (see
// globals.css) — desktop/tablet renders with no animation, same pattern
// as ScrollReveal.
export default function MediaReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`media-reveal relative ${visible ? "is-visible" : ""}`}>
      {children}
    </div>
  );
}
