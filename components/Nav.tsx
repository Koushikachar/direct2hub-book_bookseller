"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";
import ThemeToggle from "./ThemeToggle";

interface NavProps {
  logoUrl?: string;
  name?: string;
}

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/price", label: "Price" },
];

export default function Nav({
  logoUrl = "/uploads/logo-placeholder.png",
  name = "Direct2hub",
}: NavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="glass-header sticky top-0 z-50 text-brick-950 dark:text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setOpen(false)}
          >
            <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-ember-500/25 sm:h-10 sm:w-10">
              <Image
                src={logoUrl}
                alt={`${name} logo`}
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </div>
            <span className="font-display text-base font-bold tracking-tight sm:text-lg">
              {name}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-ember-600 text-white shadow-sm"
                      : "text-brick-800 hover:bg-ember-600/10 dark:text-cream/80 dark:hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="ml-2 pl-2">
              <ThemeToggle />
            </div>
          </nav>

          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle />
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 dark:border-white/15"
            >
              {open ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay — sibling of <header>, NOT nested inside it,
          so `position: fixed` is relative to the viewport, not the sticky header */}
      <div
        ref={menuRef}
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          top: "60px",
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 300ms ease-out",
        }}
        className="sm:hidden"
      >
        {/* dark, blurred backdrop over the page content behind the menu */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.62)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
        />

        {/* liquid-glass panel */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass-mobile-menu"
          style={{
            position: "relative",
            isolation: "isolate",
            margin: "12px",
            borderRadius: "24px",
            border: "1px solid rgba(255,255,255,0.25)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            backdropFilter: "blur(45px) saturate(160%)",
            WebkitBackdropFilter: "blur(45px) saturate(160%)",
            padding: "12px",
            transform: open
              ? "translateY(0) scale(1)"
              : "translateY(-12px) scale(0.95)",
            opacity: open ? 1 : 0,
            transition: "all 300ms ease-out",
          }}
        >
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-ember-600 text-white"
                      : "text-brick-800 hover:bg-black/5 dark:text-cream/90 dark:hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
