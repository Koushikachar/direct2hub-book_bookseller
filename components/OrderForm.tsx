"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import TermsModal from "./TermsModal";
import { loadRazorpayScript } from "@/lib/loadRazorpayScript";

const COUNTRY_CODES = [{ code: "+91", label: "IN +91" }];

const PRICE_LABEL = "₹199";

interface OrderFormState {
  name: string;
  email: string;
  countryCode: string;
  whatsapp: string;
}

interface OrderData {
  submissionId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  name: string;
  email: string;
  contact: string;
}

type Step = "details" | "payment";
type Status = "idle" | "loading" | "error";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

export default function OrderForm() {
  const router = useRouter();
  const [form, setForm] = useState<OrderFormState>({
    name: "",
    email: "",
    countryCode: "+91",
    whatsapp: "",
  });
  const [step, setStep] = useState<Step>("details");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);

  function update<K extends keyof OrderFormState>(
    field: K,
    value: OrderFormState[K],
  ) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Step 1: save contact details, then immediately create the Razorpay
  // order so the payment step is ready to go with a single "Pay" click.
  async function handleDetailsSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const submitRes = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok)
        throw new Error(submitData.error || "Something went wrong");

      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submitData.submissionId }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok)
        throw new Error(orderData.error || "Could not start payment");

      setOrder({
        submissionId: submitData.submissionId,
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: orderData.keyId,
        name: orderData.name,
        email: orderData.email,
        contact: orderData.contact,
      });
      setStatus("idle");
      setStep("payment");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  // Step 2: open Razorpay's checkout with the order created above.
  async function handlePay() {
    if (!order) return;
    setStatus("loading");
    setMessage("");
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded)
        throw new Error(
          "Could not load the payment gateway. Check your connection and try again.",
        );

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Direct2hub",
        description: "The Ecommerce Playbook",
        prefill: {
          name: order.name,
          email: order.email,
          contact: order.contact,
        },
        theme: { color: "#ea580c" },
        method: { upi: true, card: true, netbanking: true, wallet: true },
        handler: async (response: unknown) => {
          setStatus("loading");
          setMessage("");
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok)
              throw new Error(
                verifyData.error || "Payment verification failed.",
              );
            router.push(`/access/${verifyData.token}`);
          } catch (err) {
            setStatus("error");
            setMessage(
              err instanceof Error
                ? err.message
                : "Payment verification failed. If money was deducted, please contact support.",
            );
          }
        },
        modal: {
          ondismiss: () => setStatus("idle"),
        },
      });

      rzp.on("payment.failed", (response: unknown) => {
        const err = response as { error?: { description?: string } };
        setStatus("error");
        setMessage(
          err.error?.description || "Payment failed. Please try again.",
        );
      });

      rzp.open();
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  const isTestMode = order?.keyId?.startsWith("rzp_test_");

  if (step === "payment" && order) {
    return (
      <div className="card space-y-4 p-6">
        <div className="flex items-center gap-2 rounded-lg bg-ember-600/10 px-3 py-2 text-sm font-medium text-ember-600">
          <span>✓</span> Details saved for {order.name}
        </div>

        {isTestMode && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-center text-xs font-medium text-amber-700">
            Test mode — no real money will be charged. Use Razorpay's test
            cards/UPI.
          </div>
        )}

        <div className="rounded-lg border border-brick-700/10 p-4 text-center">
          <p className="text-sm text-brick-700/80">Amount to pay</p>
          <p className="font-display text-3xl font-bold text-ember-600">
            {PRICE_LABEL}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePay}
          disabled={status === "loading"}
          className="w-full rounded-lg bg-ember-600 py-3 font-semibold text-white transition hover:bg-ember-500 disabled:opacity-60"
        >
          {status === "loading" ? "Opening payment…" : `Pay ${PRICE_LABEL}`}
        </button>

        <button
          type="button"
          onClick={() => setStep("details")}
          className="w-full text-center text-xs text-brick-700/80 underline"
        >
          Edit your details
        </button>

        {status === "error" && (
          <p className="text-center text-sm text-red-500">{message}</p>
        )}

        <p className="text-center text-xs text-brick-700/80">
          Payments are processed securely by Razorpay (UPI, cards, netbanking,
          wallets).
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleDetailsSubmit} className="card space-y-4 p-6">
        <div className="flex items-center gap-2 rounded-lg bg-ember-600/10 px-3 py-2 text-sm font-medium text-ember-600">
          <span>✓</span> Unlocks Digital Product — {PRICE_LABEL}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-brick-700">
            Name
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-lg border border-brick-700/20 bg-transparent px-3 py-2.5 outline-none ring-ember-500/40 focus:ring-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-brick-700">
            Email Address
          </label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-brick-700/20 bg-transparent px-3 py-2.5 outline-none ring-ember-500/40 focus:ring-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-brick-700">
            WhatsApp Number
          </label>

          <div className="flex gap-2">
            <select
              value={form.countryCode}
              onChange={(e) => update("countryCode", e.target.value)}
              className="rounded-lg border border-brick-700/20 bg-transparent px-2 py-2.5 outline-none"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>

            <input
              required
              type="tel"
              inputMode="numeric"
              maxLength={10}
              minLength={10}
              pattern="[6-9][0-9]{9}"
              value={form.whatsapp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);

                update("whatsapp", value);
              }}
              placeholder="9876543210"
              className="w-full rounded-lg border border-brick-700/20 bg-transparent px-3 py-2.5 outline-none ring-ember-500/40 focus:ring-2"
            />
          </div>

          {form.whatsapp.length > 0 && form.whatsapp.length !== 10 && (
            <p className="mt-1 text-xs text-red-500">
              WhatsApp number must contain exactly 10 digits.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-lg bg-ember-600 py-3 font-semibold text-white transition hover:bg-ember-500 disabled:opacity-60"
        >
          {status === "loading"
            ? "Continuing…"
            : `Continue to payment — ${PRICE_LABEL}`}
        </button>

        {status === "error" && (
          <p className="text-center text-sm text-red-500">{message}</p>
        )}

        <p className="text-center text-xs text-brick-700/80">
          By continuing, you agree to Direct2hub's{" "}
          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            className="underline"
          >
            Terms
          </button>
          .
        </p>
      </form>

      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
}
