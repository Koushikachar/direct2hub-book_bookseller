"use client";
import { useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  FiShoppingBag,
  FiCalendar,
  FiUsers,
  FiTrendingUp,
  FiStar,
  FiBarChart2,
  FiFileText,
} from "react-icons/fi";
import { BsCurrencyRupee } from "react-icons/bs";
import type { IconType } from "react-icons";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loginError, setLoginError] = useState("");

  return unlocked ? (
    <AdminDashboard secret={secret} />
  ) : (
    <LoginGate
      secret={secret}
      setSecret={setSecret}
      error={loginError}
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoginError("");
        // Verify the secret against a real endpoint before unlocking the panel.
        let res: Response;
        try {
          res = await fetch("/api/admin/submissions", { headers: { "x-admin-secret": secret } });
        } catch {
          setLoginError("Could not reach the server. Check your connection and try again.");
          return;
        }
        if (res.status === 401) {
          setLoginError("Incorrect admin password.");
          return;
        }
        if (res.status === 429) {
          setLoginError("Too many attempts. Please wait a minute and try again.");
          return;
        }
        if (!res.ok) {
          let detail = "";
          try {
            detail = (await res.json())?.error || "";
          } catch {
            // response wasn't JSON — fall back to the generic message below
          }
          setLoginError(detail || `Server error (${res.status}). Check the server logs / env vars.`);
          return;
        }
        setUnlocked(true);
      }}
    />
  );
}

interface LoginGateProps {
  secret: string;
  setSecret: (value: string) => void;
  error: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

function LoginGate({ secret, setSecret, error, onSubmit }: LoginGateProps) {
  return (
    <div className="relative grid min-h-screen place-items-center bg-cream px-4 dark:bg-[#120A08]">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-8">
        <h1 className="mb-1 font-display text-xl font-bold text-brick-950">Admin Login</h1>
        <p className="mb-5 text-sm text-brick-700/80">Enter your admin password to continue.</p>
        <input
          type="password"
          required
          placeholder="Admin secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="mb-3 w-full rounded-lg border border-brick-700/20 bg-white px-3 py-2.5 text-brick-950 outline-none ring-ember-500/40 focus:ring-2 dark:bg-white/5 dark:placeholder:text-cream/30"
        />
        {error && <p className="mb-3 text-sm text-red-500 dark:text-red-400">{error}</p>}
        <button className="w-full rounded-lg bg-ember-600 py-2.5 font-semibold text-white transition hover:bg-ember-500">
          Enter
        </button>
      </form>
    </div>
  );
}

function AdminDashboard({ secret }: { secret: string }) {
  const [tab, setTab] = useState<"analytics" | "content" | "submissions" | "reviews">("analytics");

  return (
    <div className="min-h-screen bg-cream dark:bg-[#120A08]">
      <header className="border-b border-black/5 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#1B100C] sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-bold text-ember-600">Direct2Hub Admin</h1>
          <div className="flex flex-nowrap items-center gap-2 sm:gap-3">
            <div className="flex flex-nowrap gap-1 rounded-lg bg-brick-950/5 p-1 dark:bg-white/5">
              <TabButton icon={FiBarChart2} active={tab === "analytics"} onClick={() => setTab("analytics")}>
                Analytics
              </TabButton>
              <TabButton icon={FiFileText} active={tab === "content"} onClick={() => setTab("content")}>
                Product Content
              </TabButton>
              <TabButton icon={FiUsers} active={tab === "submissions"} onClick={() => setTab("submissions")}>
                Submissions
              </TabButton>
              <TabButton icon={FiStar} active={tab === "reviews"} onClick={() => setTab("reviews")}>
                Reviews
              </TabButton>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {tab === "analytics" && <AnalyticsPanel secret={secret} />}
        {tab === "content" && <ContentForm secret={secret} />}
        {tab === "submissions" && <SubmissionsPanel secret={secret} />}
        {tab === "reviews" && <ReviewsPanel secret={secret} />}
      </main>
    </div>
  );
}

interface AnalyticsData {
  totals: {
    totalSubmissions: number;
    totalPaid: number;
    totalRevenueInr: number;
    conversionRate: number;
    todaySales: number;
    averageRating: number;
    reviewCount: number;
  };
  daily: { label: string; sales: number; revenue: number }[];
  weekly: { label: string; sales: number; revenue: number }[];
  monthly: { label: string; sales: number; revenue: number }[];
  sixMonth: { label: string; sales: number; revenue: number }[];
  yearly: { label: string; sales: number; revenue: number }[];
  ratingBreakdown: Record<string, number>;
}

type Range = "daily" | "weekly" | "monthly" | "sixMonth" | "yearly";

const RANGE_TABS: { key: Range; label: string; hint: string }[] = [
  { key: "daily", label: "Day", hint: "Last 14 days" },
  { key: "weekly", label: "Week", hint: "Last 8 weeks" },
  { key: "monthly", label: "Month", hint: "Last 30 days" },
  { key: "sixMonth", label: "6 Months", hint: "Last 6 months" },
  { key: "yearly", label: "Year", hint: "Last 12 months" },
];

function formatRangeLabel(range: Range, label: string): string {
  if (range === "daily" || range === "weekly" || range === "monthly") {
    const d = new Date(`${label}T00:00:00Z`);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
  }
  // "YYYY-MM" for sixMonth / yearly
  const [y, m] = label.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function AnalyticsPanel({ secret }: { secret: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState<Range>("weekly");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    fetch("/api/admin/analytics", { headers: { "x-admin-secret": secret } })
      .then((res) => res.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Could not load analytics."));
  }, [secret]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data[range].map((point) => ({ ...point, label: formatRangeLabel(range, point.label) }));
  }, [data, range]);

  if (error) return <p className="card p-6 text-sm text-red-500 dark:text-red-400">{error}</p>;
  if (!data) return <p className="card p-6 text-sm text-brick-700/80">Loading analytics…</p>;

  const { totals } = data;
  const gridStroke = isDark ? "#FFFFFF14" : "#00000010";
  const tickColor = isDark ? "#F4E0D2B3" : "#5A1F0CB3";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={BsCurrencyRupee} label="Total revenue" value={`₹${totals.totalRevenueInr.toLocaleString()}`} />
        <StatCard icon={FiShoppingBag} label="Total sales" value={totals.totalPaid.toLocaleString()} />
        <StatCard icon={FiCalendar} label="Today's sales" value={totals.todaySales.toLocaleString()} />
        <StatCard icon={FiUsers} label="Submissions" value={totals.totalSubmissions.toLocaleString()} />
        <StatCard icon={FiTrendingUp} label="Conversion" value={`${totals.conversionRate}%`} />
        <StatCard
          icon={FiStar}
          label="Avg. rating"
          value={totals.reviewCount > 0 ? `${totals.averageRating}★` : "—"}
        />
      </div>

      <div className="card p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-brick-950">Sales &amp; revenue</h3>
            <p className="text-xs text-brick-700/80">{RANGE_TABS.find((r) => r.key === range)?.hint}</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg bg-brick-950/5 p-1 dark:bg-white/5">
            {RANGE_TABS.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  range === r.key
                    ? "bg-white text-ember-600 shadow-sm dark:bg-white/10"
                    : "text-brick-700/80 hover:text-brick-950 dark:text-cream/70 dark:hover:text-cream"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brick-700/80">Sales</h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tickColor }} />
                <Tooltip
                  contentStyle={
                    isDark ? { background: "#1B100C", border: "1px solid #FFFFFF1A", color: "#F4E0D2" } : undefined
                  }
                />
                <Bar dataKey="sales" fill="#FF6600" radius={[6, 6, 0, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brick-700/80">Revenue (₹)</h4>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} />
                <Tooltip
                  contentStyle={
                    isDark ? { background: "#1B100C", border: "1px solid #FFFFFF1A", color: "#F4E0D2" } : undefined
                  }
                />
                <Line type="monotone" dataKey="revenue" stroke="#FFA366" strokeWidth={2.5} dot={{ r: 3 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <RatingSummaryCard breakdown={data.ratingBreakdown} average={totals.averageRating} count={totals.reviewCount} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1B100C]">
      <div className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-ember-600/10 text-ember-600">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-brick-700/80">{label}</p>
      <p className="mt-0.5 font-display text-xl font-bold text-brick-950">{value}</p>
    </div>
  );
}

// Amazon/Flipkart-style review summary — a big average, stars, and a
// per-rating bar breakdown reads at a glance far better than a pie chart
// where every wedge needs a legend lookup.
function RatingSummaryCard({
  breakdown,
  average,
  count,
}: {
  breakdown: Record<string, number>;
  average: number;
  count: number;
}) {
  const rows = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: breakdown[String(stars)] || 0 }));
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="card p-5 sm:p-6">
      <h3 className="mb-4 font-display text-base font-bold text-brick-950">Rating breakdown</h3>
      {count === 0 ? (
        <p className="py-8 text-center text-sm text-brick-700/50">No reviews yet.</p>
      ) : (
        <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[auto_1fr]">
          <div className="text-center sm:pr-6">
            <p className="font-display text-4xl font-extrabold text-brick-950">{average.toFixed(1)}</p>
            <div className="mt-1 flex justify-center gap-0.5 text-ember-500">
              {Array.from({ length: 5 }).map((_, i) => {
                // Fractional fill so e.g. a 4.7 average shows a
                // partially-filled 5th star instead of rounding up to a
                // solid 5 (which visually contradicted the "4.7" label).
                const fillPct = Math.max(0, Math.min(1, average - i)) * 100;
                return (
                  <span key={i} className="relative inline-block h-4 w-4">
                    <FiStar className="absolute inset-0 h-4 w-4 opacity-30" />
                    <span className="absolute inset-0 h-4 w-4 overflow-hidden" style={{ width: `${fillPct}%` }}>
                      <FiStar className="h-4 w-4 fill-current" />
                    </span>
                  </span>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-brick-700/80">{count.toLocaleString()} review{count === 1 ? "" : "s"}</p>
          </div>

          <div className="space-y-2 sm:border-l sm:border-black/5 sm:pl-6 dark:sm:border-white/10">
            {rows.map((row) => (
              <div key={row.stars} className="flex items-center gap-3 text-sm">
                <span className="w-10 shrink-0 text-brick-700/80">{row.stars}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-brick-950/5 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-ember-500"
                    style={{ width: `${(row.count / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-brick-700/80">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: IconType;
  children: ReactNode;
}

function TabButton({ active, onClick, icon: Icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      title={typeof children === "string" ? children : undefined}
      aria-label={typeof children === "string" ? children : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:px-4 ${
        active
          ? "bg-white text-ember-600 shadow-sm dark:bg-white/10"
          : "text-brick-700/80 hover:text-brick-950 dark:text-cream/70 dark:hover:text-cream"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

type FormStatus = "idle" | "loading" | "success" | "error";

// Maps each <FileField name=...> to the "kind" the sign endpoint expects
// and the Product column its resulting URL is saved into.
const FILE_FIELDS: { name: string; kind: string; urlField: string; label: string }[] = [
  { name: "logo", kind: "logo", urlField: "logoUrl", label: "logo" },
  { name: "heroImage", kind: "hero", urlField: "heroImageUrl", label: "hero image" },
  { name: "video", kind: "video", urlField: "videoUrl", label: "video" },
  { name: "pdf", kind: "pdf", urlField: "pdfUrl", label: "PDF" },
];

function ContentForm({ secret }: { secret: string }) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const payload: Record<string, string | number> = {};

      for (const key of [
        "title",
        "tagline",
        "about",
        "learnFrom",
        "learnFromBio",
        "contactPhone",
        "whatsappUrl",
        "youtubeUrl",
        "instagramUrl",
      ]) {
        const value = formData.get(key);
        if (typeof value === "string" && value.length > 0) payload[key] = value;
      }

      // Each selected file goes straight to Supabase Storage from the
      // browser via a signed URL — never through our own API route — so
      // a large video never touches Vercel's ~4.5MB function body limit.
      for (const { name, kind, urlField, label } of FILE_FIELDS) {
        const file = formData.get(name) as File | null;
        if (!file || file.size === 0) continue;

        setMessage(`Uploading ${label}…${file.size > 5 * 1024 * 1024 ? " this can take a while for large files" : ""}`);

        const signRes = await fetch("/api/admin/upload/sign", {
          method: "POST",
          headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
          body: JSON.stringify({ kind, filename: file.name, contentType: file.type, size: file.size }),
        });
        const signData = await signRes.json();
        if (!signRes.ok) throw new Error(signData.error || `Could not prepare ${label} upload`);

        const { getSupabaseBrowser } = await import("@/lib/supabaseBrowser");
        const supabase = getSupabaseBrowser();
        const { error: uploadError } = await supabase.storage
          .from(signData.bucket)
          .uploadToSignedUrl(signData.path, signData.token, file);
        if (uploadError) throw new Error(`${label}: ${uploadError.message}`);

        if (kind === "pdf") {
          payload.pdfUrl = signData.path;
          payload.pdfSizeKb = Math.round(file.size / 1024);
        } else {
          payload[urlField] = signData.publicUrl;
        }
      }

      setMessage("Saving…");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStatus("success");
      setMessage("Saved! Visit the homepage to see it live.");
      form.reset();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <form onSubmit={handleUpload} className="card space-y-6 p-6 sm:p-8">
      <Section title="Basics">
        <Field label="Title" name="title" />
        <Field label="Tagline (shown on the home page hero)" name="tagline" />
        <Field label="About" name="about" textarea />
      </Section>

      <Section title="You'll learn from">
        <Field label="Learn-from name" name="learnFrom" />
        <Field label="Learn-from bio" name="learnFromBio" textarea />
      </Section>

      <Section title="Contact & socials">
        <Field label="Contact phone" name="contactPhone" />
        <Field label="WhatsApp URL" name="whatsappUrl" />
        <Field label="YouTube URL" name="youtubeUrl" />
        <Field label="Instagram URL" name="instagramUrl" />
      </Section>

      <Section title="Media">
        <FileField label="Logo (shown in the nav)" name="logo" accept="image/*" />
        <FileField label="Hero / cover image" name="heroImage" accept="image/*" />
        <FileField label="Showcase video (Home + About pages)" name="video" accept="video/mp4,video/webm,video/quicktime" />
        <FileField label="Ebook PDF" name="pdf" accept="application/pdf" />
      </Section>

      <button
        disabled={status === "loading"}
        className="w-full rounded-lg bg-ember-600 py-3 font-semibold text-white transition hover:bg-ember-500 disabled:opacity-60"
      >
        {status === "loading" ? "Saving…" : "Save"}
      </button>

      {message && (
        <p className={`text-center text-sm ${status === "error" ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
          {message}
        </p>
      )}
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 border-t border-black/5 pt-6 first:border-0 first:pt-0 dark:border-white/10">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ember-600">{title}</h2>
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  name: string;
  textarea?: boolean;
}

function Field({ label, name, textarea }: FieldProps) {
  const Comp = textarea ? "textarea" : "input";
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-brick-950">{label}</label>
      <Comp
        name={name}
        rows={textarea ? 4 : undefined}
        className="w-full rounded-lg border border-brick-700/20 bg-white px-3 py-2.5 text-sm text-brick-950 outline-none ring-ember-500/40 placeholder:text-brick-700/40 focus:ring-2 dark:bg-white/5"
      />
    </div>
  );
}

interface FileFieldProps {
  label: string;
  name: string;
  accept: string;
}

function FileField({ label, name, accept }: FileFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-brick-950">{label}</label>
      <input
        type="file"
        name={name}
        accept={accept}
        className="block w-full text-sm text-brick-700 file:mr-3 file:rounded-lg file:border-0 file:bg-ember-600/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ember-600 hover:file:bg-ember-600/20"
      />
    </div>
  );
}

interface Submission {
  id: string;
  name: string;
  email: string;
  countryCode: string;
  whatsapp: string;
  downloadCount: number;
  paymentStatus: string;
  createdAt: string;
}

async function downloadInvoice(secret: string, submission: Submission, onError: (msg: string) => void) {
  try {
    const res = await fetch(`/api/admin/invoice/${submission.id}`, { headers: { "x-admin-secret": secret } });
    if (!res.ok) throw new Error("Invoice download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${submission.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    onError("Could not download the invoice.");
  }
}

interface SubmissionsResponse {
  ok: boolean;
  submissions: Submission[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function SubmissionsPanel({ secret }: { secret: string }) {
  const [data, setData] = useState<SubmissionsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/submissions?page=${page}`, { headers: { "x-admin-secret": secret } })
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setError("Could not load submissions."));
  }, [secret, page]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export", { headers: { "x-admin-secret": secret } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "direct2hub-submissions.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not export submissions.");
    } finally {
      setExporting(false);
    }
  }

  const submissions = data?.submissions || [];

  return (
    <div className="card space-y-4 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-brick-950">All submissions</h2>
          <p className="text-sm text-brick-700/80">
            {data ? `${data.total.toLocaleString()} total` : "Loading…"}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || !data?.total}
          className="rounded-lg bg-ember-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ember-500 disabled:opacity-50"
        >
          {exporting ? "Preparing…" : "Download as Excel (CSV)"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

      {submissions.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-brick-700/80 dark:border-white/10">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">WhatsApp</th>
                  <th className="py-2 pr-4">Payment</th>
                  <th className="py-2 pr-4">Downloads</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-2 pr-4 font-medium text-brick-950">{s.name}</td>
                    <td className="py-2 pr-4 text-brick-700">{s.email}</td>
                    <td className="py-2 pr-4 text-brick-700">
                      {s.countryCode} {s.whatsapp}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          s.paymentStatus === "paid"
                            ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/15 dark:text-green-300"
                            : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                        }
                      >
                        {s.paymentStatus === "paid" ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-brick-700">{s.downloadCount} / 3</td>
                    <td className="py-2 pr-4 text-brick-700">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4">
                      {s.paymentStatus === "paid" ? (
                        <button
                          onClick={() => downloadInvoice(secret, s, setError)}
                          className="rounded-lg border border-ember-600 px-3 py-1 text-xs font-semibold text-ember-600 transition hover:bg-ember-600 hover:text-white"
                        >
                          PDF
                        </button>
                      ) : (
                        <span className="text-xs text-brick-700/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-brick-700/20 px-3 py-1.5 text-brick-700 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-brick-700/80">
              Page {data?.page} of {data?.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data?.totalPages ?? p, p + 1))}
              disabled={page >= (data?.totalPages ?? 1)}
              className="rounded-lg border border-brick-700/20 px-3 py-1.5 text-brick-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}

      {data && submissions.length === 0 && (
        <p className="text-sm text-brick-700/80">No submissions yet.</p>
      )}
    </div>
  );
}

interface AdminReview {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function ReviewsPanel({ secret }: { secret: string }) {
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; rating: number; comment: string }>({
    name: "",
    rating: 5,
    comment: "",
  });
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  useEffect(() => {
    fetch("/api/reviews?limit=50")
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews || []))
      .catch(() => setError("Could not load reviews."));
  }, []);

  function startEdit(r: AdminReview) {
    setEditingId(r.id);
    setDraft({ name: r.name, rating: r.rating, comment: r.comment });
  }

  async function saveEdit(id: string) {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save review.");
      setReviews((prev) => (prev ? prev.map((r) => (r.id === id ? data.review : r)) : prev));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review.");
    } finally {
      setStatus("idle");
    }
  }

  async function deleteReview(id: string) {
    if (!window.confirm("Delete this review? This can't be undone.")) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete review.");
      setReviews((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete review.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="card space-y-4 p-6 sm:p-8">
      <div>
        <h2 className="font-display text-lg font-bold text-brick-950">Customer reviews</h2>
        <p className="text-sm text-brick-700/80">
          {reviews ? `${reviews.length} shown` : "Loading…"} — edit or remove any review.
        </p>
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

      <ul className="divide-y divide-black/5 dark:divide-white/10">
        {(reviews || []).map((r) => (
          <li key={r.id} className="py-4">
            {editingId === r.id ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    className="flex-1 rounded-lg border border-brick-700/20 bg-white px-3 py-2 text-sm text-brick-950 outline-none ring-ember-500/40 focus:ring-2 dark:bg-white/5"
                  />
                  <select
                    value={draft.rating}
                    onChange={(e) => setDraft((d) => ({ ...d, rating: Number(e.target.value) }))}
                    className="rounded-lg border border-brick-700/20 bg-white px-2 py-2 text-sm text-brick-950 outline-none dark:bg-white/5"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} ★
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={draft.comment}
                  onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-brick-700/20 bg-white px-3 py-2 text-sm text-brick-950 outline-none ring-ember-500/40 focus:ring-2 dark:bg-white/5"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(r.id)}
                    disabled={status === "loading"}
                    className="rounded-lg bg-ember-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-brick-700/20 px-4 py-1.5 text-sm text-brick-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-brick-950">
                    {r.name} <span className="text-ember-600">{"★".repeat(r.rating)}</span>
                  </p>
                  <p className="mt-1 text-sm text-brick-700">{r.comment}</p>
                </div>
                <div className="flex shrink-0 gap-3 text-xs font-medium">
                  <button onClick={() => startEdit(r)} className="text-ember-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => deleteReview(r.id)} className="text-brick-700/80 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {reviews && reviews.length === 0 && <p className="text-sm text-brick-700/80">No reviews yet.</p>}
    </div>
  );
}
