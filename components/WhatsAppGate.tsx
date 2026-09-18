"use client";
import { useEffect, useState } from "react";
import { FaWhatsapp, FaCheckCircle } from "react-icons/fa";

interface WhatsAppGateProps {
  /** Admin-configured group invite link (Product.whatsappUrl). When this
   *  isn't set yet, the gate is skipped entirely so a buyer is never
   *  blocked by an admin setting that hasn't been filled in. */
  whatsappUrl?: string;
  /** Unique per-purchase key so the "already joined" unlock persists
   *  across reloads without needing a server round trip. */
  storageKey: string;
  children: React.ReactNode;
}

export default function WhatsAppGate({ whatsappUrl, storageKey, children }: WhatsAppGateProps) {
  const [joined, setJoined] = useState(false);
  const [opened, setOpened] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setJoined(window.localStorage.getItem(storageKey) === "1");
    } catch {
      // localStorage unavailable — just show the gate, no persistence.
    }
    setHydrated(true);
  }, [storageKey]);

  function unlock() {
    setJoined(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // ignore — unlock still works for this page view
    }
  }

  if (!whatsappUrl) return <>{children}</>;
  if (!hydrated) return <div className="h-40 animate-pulse rounded-2xl bg-brick-700/5 dark:bg-white/5" />;
  if (joined) return <>{children}</>;

  return (
    <div className="space-y-4 rounded-2xl border border-[#25D366]/25 bg-gradient-to-br from-[#25D366]/10 via-transparent to-ember-600/5 p-5 text-center dark:from-[#25D366]/15">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#25D366]/15 text-[#25D366]">
        <FaWhatsapp className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-bold">One quick step before your download</h3>
      <p className="text-sm text-brick-700/75 dark:text-cream/65">
        Join our WhatsApp group — for updates, bonus resources, and direct support — then come back here to unlock
        your file.
      </p>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setOpened(true)}
        className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3 font-semibold text-white shadow-lg shadow-[#25D366]/25 transition hover:-translate-y-0.5 hover:bg-[#1fbd5b]"
      >
        <FaWhatsapp className="h-4 w-4" /> Join the WhatsApp group
      </a>

      <button
        type="button"
        onClick={unlock}
        className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold transition ${
          opened
            ? "bg-ember-600 text-white hover:bg-ember-500"
            : "bg-brick-700/10 text-brick-700/80 hover:bg-brick-700/15 dark:bg-white/5 dark:text-cream/70"
        }`}
      >
        <FaCheckCircle className="h-4 w-4" /> I&apos;ve joined — unlock my download
      </button>

      <p className="text-xs text-brick-700/50 dark:text-cream/40">You only need to do this once.</p>
    </div>
  );
}
