"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Fades + slides each wrapped block up into place as it scrolls into view.
// Scoped to mobile only via the CSS in globals.css (.reveal-on-scroll's
// transition/initial-hidden state only applies under the mobile media
// query) — on tablet/desktop this renders with no animation at all.
export default function ScrollReveal({
  children,
  delayMs = 0,
  className = "",
  allBreakpoints = false,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
  allBreakpoints?: boolean;
}) {
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
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const base = allBreakpoints ? "reveal-on-scroll-all" : "reveal-on-scroll";

  return (
    <div
      ref={ref}
      className={`${base} ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
