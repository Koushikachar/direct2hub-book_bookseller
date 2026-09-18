import Image from "next/image";
import type { ComponentType } from "react";
import { FaWhatsapp, FaYoutube, FaInstagram, FaPhoneAlt } from "react-icons/fa";
import type { ProductView } from "@/lib/types";

interface ProductDetailsProps {
  product: ProductView;
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-[16/9] w-full">
        <Image
          src={product.heroImageUrl}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-cover"
          priority
        />
      </div>

      <div className="space-y-8 p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold leading-snug sm:text-3xl">
          {product.title}
        </h1>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ember-600">
            {product.aboutTitle}
          </h2>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-brick-800">
            {product.about}
          </p>
        </section>

        {product.bullets?.length > 0 && (
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {product.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <span className="text-ember-500">●</span> {b}
              </li>
            ))}
          </ul>
        )}

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ember-600">
            What you'll get
          </h2>
          <dl className="divide-y divide-brick-700/10 overflow-hidden rounded-xl border border-brick-700/10">
            <Row label="Number of resources" value="1" />
            <Row label="Resource content" value="File" />
            <Row label="Total file size" value={`${product.pdfSizeKb} KB`} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ember-600">
            You'll learn from
          </h2>
          <div className="flex items-start gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
              <Image src={product.heroImageUrl} alt={product.learnFrom} fill sizes="56px" className="object-cover" />
            </div>
            <div>
              <p className="font-semibold">{product.learnFrom}</p>
              <p className="text-sm text-brick-700/80">{product.learnFromBio}</p>
              <div className="mt-2 flex gap-2">
                {product.youtubeUrl && (
                  <SocialIcon href={product.youtubeUrl} icon={FaYoutube} />
                )}
                {product.whatsappUrl && (
                  <SocialIcon href={product.whatsappUrl} icon={FaWhatsapp} />
                )}
                {product.instagramUrl && (
                  <SocialIcon href={product.instagramUrl} icon={FaInstagram} />
                )}
              </div>
            </div>
          </div>
        </section>

        {product.contactPhone && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ember-600">
              Contact me for any issues or queries
            </h2>
            <a href={`tel:${product.contactPhone}`} className="flex items-center gap-2 text-sm">
              <FaPhoneAlt className="text-ember-500" /> {product.contactPhone}
            </a>
          </section>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-brick-700/80">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SocialIcon({ href, icon: Icon }: { href: string; icon: ComponentType<{ size?: number }> }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="grid h-8 w-8 place-items-center rounded-lg bg-ember-600/10 text-ember-600 transition hover:bg-ember-600/20"
    >
      <Icon size={14} />
    </a>
  );
}
