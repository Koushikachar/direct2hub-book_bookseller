import type { Metadata } from "next";
import { FaWhatsapp, FaPhoneAlt, FaInstagram, FaYoutube, FaEnvelope } from "react-icons/fa";
import Nav from "@/components/Nav";
import ContactForm from "@/components/ContactForm";
import { getProduct } from "@/lib/product";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Direct2hub for support, questions, or partnership enquiries.",
};

export default async function ContactPage() {
  const product = await getProduct();

  const CHANNELS = [
    product.contactPhone && { icon: FaPhoneAlt, label: product.contactPhone, href: `tel:${product.contactPhone}` },
    product.whatsappUrl && { icon: FaWhatsapp, label: "Chat on WhatsApp", href: product.whatsappUrl },
    product.youtubeUrl && { icon: FaYoutube, label: "YouTube", href: product.youtubeUrl },
    product.instagramUrl && { icon: FaInstagram, label: "Instagram", href: product.instagramUrl },
  ].filter(Boolean) as { icon: typeof FaPhoneAlt; label: string; href: string }[];

  return (
    <div className="min-h-screen">
      <Nav logoUrl={product.logoUrl} name="Direct2hub" />

      <div className="hero-glow border-b border-black/5 py-10 text-center dark:border-white/10">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">We&apos;d love to hear from you</h1>
        <p className="mx-auto mt-2 max-w-lg px-4 text-brick-700/80 dark:text-cream/75">
          Questions about the playbook, your order, or a partnership? Send us a message.
        </p>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
          <div className="space-y-4 lg:col-span-2">
            <div className="card p-6">
              <h2 className="mb-4 font-display text-lg font-bold">Reach us directly</h2>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ember-600/10 text-ember-600">
                    <FaEnvelope className="h-4 w-4" />
                  </span>
                  <span>Use the form — replies land in your inbox.</span>
                </li>
                {CHANNELS.map((c) => (
                  <li key={c.label}>
                    <a
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm transition hover:text-ember-600"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ember-600/10 text-ember-600">
                        <c.icon className="h-4 w-4" />
                      </span>
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <h2 className="mb-2 font-display text-base font-bold">Response time</h2>
              <p className="text-sm text-brick-700/80 dark:text-cream/75">
                We typically reply within 24 hours on business days. For urgent order issues, WhatsApp is fastest.
              </p>
            </div>
          </div>

          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </main>
    </div>
  );
}
