import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ProductDetails from "@/components/ProductDetails";
import DownloadButton from "@/components/DownloadButton";
import WhatsAppGate from "@/components/WhatsAppGate";
import { prisma } from "@/lib/db";
import { deviceCookieName, MAX_DEVICES } from "@/lib/tokens";
import type { Submission, Product } from "@prisma/client";

const MAX_DOWNLOADS = 3;

// The link itself has to stay an unguessable random token — that's what
// keeps a download link from being forwarded around and used by anyone
// who gets hold of it. But the page (and its browser tab title) can still
// have a proper, human name instead of showing the raw token.
export async function generateMetadata(): Promise<Metadata> {
  const product = await prisma.product.findFirst({ orderBy: { updatedAt: "desc" } });
  const title = product?.title || "Your download";
  return { title: `${title} — Your download | Direct2hub` };
}

async function getSubmissionAndProduct(
  token: string
): Promise<{ submission: Submission; product: Product | null } | null> {
  try {
    const submission = await prisma.submission.findUnique({ where: { accessToken: token } });
    if (!submission) return null;

    // Only count views once the file is actually reachable — a pending
    // payment shouldn't burn view counts on a page with nothing to show.
    if (submission.paymentStatus === "paid") {
      await prisma.submission.update({
        where: { id: submission.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    const product = await prisma.product.findFirst({ orderBy: { updatedAt: "desc" } });
    return { submission, product };
  } catch {
    return null;
  }
}

export default async function AccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const data = await getSubmissionAndProduct(token);
  if (!data || !data.product) notFound();

  const { submission, product } = data;

  if (submission.paymentStatus !== "paid") {
    return (
      <div className="min-h-screen">
        <Nav logoUrl={product.logoUrl} name="Direct2hub" />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="card space-y-3 p-6">
            <h2 className="font-display text-xl font-bold text-ember-600">Payment not completed</h2>
            <p className="text-sm text-brick-700/80">
              We haven't received a successful payment for this link yet. If you completed a payment and money was
              deducted, please contact support — otherwise, head back and complete checkout to unlock your file.
            </p>
            <a href="/" className="inline-block rounded-lg bg-ember-600 px-4 py-2 text-sm font-semibold text-white">
              Back to home
            </a>
          </div>
        </main>
      </div>
    );
  }

  // The link itself is only a secret while it's only ever been opened on a
  // handful of devices — otherwise it's just a shareable URL that skips
  // payment. Every browser that opens it gets its own claim cookie; up to
  // MAX_DEVICES distinct claims are allowed (e.g. buyer's phone + laptop),
  // via a redirect to /api/access/claim that sets the cookie.
  const cookieStore = await cookies();
  const deviceCookie = cookieStore.get(deviceCookieName(submission.id))?.value;
  const alreadyClaimedByThisDevice = Boolean(deviceCookie) && submission.deviceTokens.includes(deviceCookie!);

  if (!alreadyClaimedByThisDevice && submission.deviceTokens.length < MAX_DEVICES) {
    redirect(`/api/access/claim?token=${encodeURIComponent(token)}`);
  }

  if (!alreadyClaimedByThisDevice) {
    return (
      <div className="min-h-screen">
        <Nav logoUrl={product.logoUrl} name="Direct2hub" />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="card space-y-3 p-6">
            <h2 className="font-display text-xl font-bold text-ember-600">This link is already in use</h2>
            <p className="text-sm text-brick-700/80">
              This download link can only be opened on {MAX_DEVICES} devices, to keep it from being shared or
              forwarded, and that limit has been reached. If this is your purchase and you need it on another
              device, contact support with the email or WhatsApp number you used at checkout and we'll help you
              regain access.
            </p>
            <a href="/" className="inline-block rounded-lg bg-ember-600 px-4 py-2 text-sm font-semibold text-white">
              Back to home
            </a>
          </div>
        </main>
      </div>
    );
  }

  const remaining = Math.max(0, MAX_DOWNLOADS - submission.downloadCount);

  return (
    <div className="min-h-screen">
      <Nav logoUrl={product.logoUrl} name="Direct2hub" />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start lg:gap-8">
          <div className="lg:col-span-3">
            <ProductDetails product={product} />
          </div>

          <div className="lg:sticky lg:top-24 lg:col-span-2">
            <div className="card space-y-4 p-6 text-center">
              <p className="text-sm text-brick-700/80">
                Welcome, <span className="font-semibold">{submission.name}</span>
              </p>
              <h2 className="font-display text-xl font-bold text-ember-600">Your file is ready</h2>
              {product.pdfUrl ? (
                <WhatsAppGate whatsappUrl={product.whatsappUrl} storageKey={`d2h-wa-joined-${submission.accessToken}`}>
                  <DownloadButton token={submission.accessToken} initialRemaining={remaining} />
                </WhatsAppGate>
              ) : (
                <p className="text-sm text-brick-700/80">
                  The file hasn't been uploaded by the admin yet — please check back shortly.
                </p>
              )}
              <a
                href={`/api/invoice/${encodeURIComponent(submission.accessToken)}`}
                className="inline-block text-sm font-medium text-ember-600 underline underline-offset-2 hover:text-ember-500"
              >
                Download invoice (PDF)
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
