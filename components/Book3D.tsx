"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * Real, six-face CSS 3D book (front / back / spine / pages / top / bottom
 * built with the standard translateZ cube technique, not a flat image on a
 * tilted plane). Fully drag-rotatable with mouse or touch (unified via the
 * Pointer Events API), unclamped on the Y axis so it spins freely well past
 * 360°, with inertia on release, a light idle auto-rotate when left alone,
 * and a glossy highlight + ground shadow that both track the current
 * rotation so the lighting reads as real instead of painted on.
 */
export default function Book3D({
  coverImageSrc = "/covers/ecommerce-playbook-cover.webp",
}: {
  /** The real, designed front-cover artwork — replaces the old
   *  text-built cover face so the 3D mockup matches the actual
   *  printed/exported cover pixel-for-pixel. */
  coverImageSrc?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const book = bookRef.current;
    const shadow = shadowRef.current;
    if (!stage || !book || !shadow) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const CLAMP_X_MIN = -72;
    const CLAMP_X_MAX = 78;
    const DRAG_SENS = 0.38;
    const IDLE_DELAY = 2200; // ms of stillness before auto-rotate resumes
    const IDLE_SPEED = 0.05; // deg/frame
    const FRICTION = 0.945;

    let rotY = -30;
    let rotX = 10;
    let velocity = 0;
    let dragging = false;
    let pointerId: number | null = null;
    let startPointerX = 0;
    let startPointerY = 0;
    let startRotY = rotY;
    let startRotX = rotX;
    let lastMoveX = 0;
    let lastMoveTime = 0;
    let lastInteraction = 0;
    let hasInteracted = false;
    let raf = 0;
    const t0 = performance.now();

    const frame = (time: number) => {
      const elapsed = (time - t0) / 1000;
      const floatY = reduceMotion ? 0 : Math.sin(elapsed * 0.9) * 6;

      if (!dragging) {
        if (Math.abs(velocity) > 0.01) {
          rotY += velocity;
          velocity *= FRICTION;
        } else if (!reduceMotion && time - lastInteraction > IDLE_DELAY) {
          rotY += IDLE_SPEED;
        }
      }

      book.style.transform = `translateY(${floatY.toFixed(2)}px) rotateX(${rotX.toFixed(
        2
      )}deg) rotateY(${rotY.toFixed(2)}deg)`;

      const rad = (rotY * Math.PI) / 180;
      const lx = 50 + Math.sin(rad) * 45;
      const ly = 16 + Math.cos(rad * 0.6) * 10;
      book.style.setProperty("--lx", `${lx.toFixed(1)}%`);
      book.style.setProperty("--ly", `${ly.toFixed(1)}%`);

      const scaleX = 0.7 + Math.abs(Math.cos(rad)) * 0.34;
      const skew = Math.sin(rad) * 12;
      shadow.style.transform = `translateX(-50%) scaleX(${scaleX.toFixed(
        3
      )}) skewX(${skew.toFixed(2)}deg)`;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      pointerId = e.pointerId;
      try {
        stage.setPointerCapture(pointerId);
      } catch {
        // ignore — some browsers reject capture on non-primary buttons
      }
      startPointerX = e.clientX;
      startPointerY = e.clientY;
      startRotY = rotY;
      startRotX = rotX;
      lastMoveX = e.clientX;
      lastMoveTime = performance.now();
      velocity = 0;
      lastInteraction = performance.now();
      if (!hasInteracted) {
        hasInteracted = true;
        hintRef.current?.classList.add("book3d-hint--hidden");
      }
      stage.classList.add("book3d-stage--grabbing");
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startPointerX;
      const dy = e.clientY - startPointerY;
      rotY = startRotY + dx * DRAG_SENS;
      rotX = Math.min(CLAMP_X_MAX, Math.max(CLAMP_X_MIN, startRotX - dy * DRAG_SENS));

      const now = performance.now();
      const dt = now - lastMoveTime;
      if (dt > 0) velocity = (e.clientX - lastMoveX) * DRAG_SENS * (16 / dt);
      lastMoveX = e.clientX;
      lastMoveTime = now;
      lastInteraction = now;
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      lastInteraction = performance.now();
      stage.classList.remove("book3d-stage--grabbing");
      if (pointerId !== null) {
        try {
          stage.releasePointerCapture(pointerId);
        } catch {
          // no-op
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const step = 8;
      if (e.key === "ArrowLeft") {
        rotY -= step;
        lastInteraction = performance.now();
      } else if (e.key === "ArrowRight") {
        rotY += step;
        lastInteraction = performance.now();
      } else if (e.key === "ArrowUp") {
        rotX = Math.min(CLAMP_X_MAX, rotX + step / 2);
        lastInteraction = performance.now();
      } else if (e.key === "ArrowDown") {
        rotX = Math.max(CLAMP_X_MIN, rotX - step / 2);
        lastInteraction = performance.now();
      } else {
        return;
      }
      e.preventDefault();
    };

    stage.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    stage.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      stage.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div
      className="book3d-stage"
      ref={stageRef}
      tabIndex={0}
      role="img"
      aria-label="Interactive 3D preview of The Ecommerce Playbook. Drag, or use the arrow keys, to rotate it."
    >
      <div className="book3d-shadow" ref={shadowRef} aria-hidden />

      <div className="book3d" ref={bookRef}>
        <div className="book3d-face book3d-face--front">
          {/* Real cover artwork — the shading/gloss overlays in
              globals.css (::before / ::after on this face) still sit on
              top of the image via z-index, so the light-tracking sweep
              still sells the 3D-ness even with a flat image underneath. */}
          <Image
            src={coverImageSrc}
            alt="The Ecommerce Playbook — book cover"
            fill
            sizes="(max-width: 480px) 186px, 250px"
            className="book3d-cover-image"
            style={{ objectFit: "cover" }}
            draggable={false}
            priority
            fetchPriority="high"
          />
        </div>

        <div className="book3d-face book3d-face--back">
          <div className="book3d-back-content">
            <span className="book3d-back-eyebrow">The Ecommerce Playbook</span>
            <p className="book3d-back-blurb">
              16 chapters. One clear path from idea to first sale — sourcing, pricing, listings
              and your first 10 organic sales, laid out step by step.
            </p>
            <div className="book3d-back-rule" />
            <div className="book3d-back-price">
              ₹199<span>Full digital playbook</span>
            </div>
            <div className="book3d-back-foot">
              <span className="book3d-back-url">DIRECT2HUB.COM</span>
              <span className="book3d-barcode" aria-hidden />
            </div>
          </div>
        </div>

        <div className="book3d-face book3d-face--spine">
          <span className="book3d-spine-text">DIRECT2HUB · THE ECOMMERCE PLAYBOOK</span>
        </div>

        <div className="book3d-face book3d-face--pages" aria-hidden />
        <div className="book3d-face book3d-face--top" aria-hidden />
        <div className="book3d-face book3d-face--bottom" aria-hidden />
      </div>

      <div className="book3d-hint" ref={hintRef}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12h6M9 12l2-2M9 12l2 2M15 12l-2-2M15 12l-2 2" />
          <rect x="3" y="7" width="18" height="10" rx="3" />
        </svg>
        Drag to rotate · 360°
      </div>
    </div>
  );
}
