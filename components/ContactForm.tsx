"use client";
import { useState, type FormEvent } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function update<K extends keyof typeof form>(field: K, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("success");
      setMessage("Message sent! We'll get back to you within 24 hours.");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/15">
          ✓
        </div>
        <h3 className="font-display text-lg font-bold">Message sent!</h3>
        <p className="mt-1 text-sm text-brick-700/80 dark:text-cream/75">{message}</p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium text-ember-600 underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6 sm:p-8">
      <div>
        <label className="mb-1 block text-xs font-medium text-brick-700 dark:text-cream/70">Name</label>
        <input
          required
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Your full name"
          className="w-full rounded-lg border border-brick-700/20 bg-transparent px-3 py-2.5 outline-none ring-ember-500/40 focus:ring-2 dark:border-white/15"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-brick-700 dark:text-cream/70">Email</label>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-brick-700/20 bg-transparent px-3 py-2.5 outline-none ring-ember-500/40 focus:ring-2 dark:border-white/15"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-brick-700 dark:text-cream/70">Message</label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          placeholder="How can we help?"
          className="w-full rounded-lg border border-brick-700/20 bg-transparent px-3 py-2.5 outline-none ring-ember-500/40 focus:ring-2 dark:border-white/15"
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg bg-ember-600 py-3 font-semibold text-white transition hover:bg-ember-500 disabled:opacity-60"
      >
        {status === "loading" ? "Sending…" : "Send message"}
      </button>
      {status === "error" && <p className="text-center text-sm text-red-500">{message}</p>}
    </form>
  );
}
