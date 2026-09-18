"use client";
import { useEffect, useState } from "react";
import { FaCheckCircle } from "react-icons/fa";

interface Item {
  firstName: string;
  paidAt: string;
}

function timeAgoShort(iso: string): string {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Shows real recent purchases only — pulled from /api/recent-activity, which
// reads actual paid orders. There is no fabricated name or invented count
// here: if nobody has bought recently, this component renders nothing at
// all rather than making up activity to create false urgency.
export default function RecentActivity() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/recent-activity")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok) setItems(data.items || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!items || items.length === 0 || dismissed) return;

    // Random 5-10s gap between each real purchase shown, rather than a
    // fixed interval — reads more natural without inventing any data.
    const randomGap = () => 5000 + Math.random() * 5000;
    let hideTimeout: ReturnType<typeof setTimeout>;
    let nextTimeout: ReturnType<typeof setTimeout>;
    let advanceTimeout: ReturnType<typeof setTimeout>;

    const showNext = () => {
      setVisible(true);
      hideTimeout = setTimeout(() => setVisible(false), 5500);
      nextTimeout = setTimeout(() => {
        advanceTimeout = setTimeout(() => {
          setIndex((i) => (i + 1) % items.length);
          showNext();
        }, 500);
      }, randomGap());
    };

    const startTimeout = setTimeout(showNext, 2000);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(hideTimeout);
      clearTimeout(nextTimeout);
      clearTimeout(advanceTimeout);
    };
  }, [items, dismissed]);

  if (!items || items.length === 0 || dismissed) return null;
  const current = items[index];

  return (
    <div
      className={`fixed bottom-4 left-4 z-40 max-w-xs transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div
        className="card flex items-start gap-3 p-3.5 pr-8 shadow-2xl"
        style={{ borderLeft: "3px solid #FF6600" }}
      >
        <span
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white shadow-sm"
          style={{ background: "linear-gradient(145deg, #FF8533, #FF6600)" }}
        >
          <FaCheckCircle className="h-4 w-4" />
        </span>
        <div className="text-xs leading-snug">
          <p className="font-semibold text-brick-950 dark:text-cream">
            {current.firstName} just got the playbook
          </p>
          <p className="mt-0.5 text-brick-700/80 dark:text-cream/70">{timeAgoShort(current.paidAt)}</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute right-2 top-2 text-brick-700/40 hover:text-brick-700 dark:text-cream/40 dark:hover:text-cream"
        >
          ×
        </button>
      </div>
    </div>
  );
}
