"use client";
import { useState } from "react";

type Status = "idle" | "loading" | "blocked" | "error";

interface DownloadButtonProps {
  token: string;
  initialRemaining: number;
}

function filenameFromDisposition(disposition: string | null): string {
  if (!disposition) return "ebook.pdf";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match ? match[1] : "ebook.pdf";
}

export default function DownloadButton({ token, initialRemaining }: DownloadButtonProps) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleDownload() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const contentType = res.headers.get("content-type") || "";

      // A successful response is the PDF itself, not JSON — the file is
      // streamed straight from our server so it starts downloading
      // immediately instead of navigating to a separate link.
      if (!res.ok || !contentType.includes("application/pdf")) {
        const data = await res.json().catch(() => ({}));
        setStatus(data.limitReached ? "blocked" : "error");
        setMessage(data.error || "Something went wrong.");
        return;
      }

      const filename = filenameFromDisposition(res.headers.get("content-disposition"));
      const remainingHeader = res.headers.get("x-remaining");

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      setRemaining(remainingHeader ? Number(remainingHeader) : remaining - 1);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "blocked" || remaining <= 0) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
        You've reached the maximum download limit. You can't download this file anymore.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleDownload}
        disabled={status === "loading"}
        className="block w-full rounded-lg bg-ember-600 py-3 font-semibold text-white transition hover:bg-ember-500 disabled:opacity-60"
      >
        {status === "loading" ? "Preparing…" : "Download the Ebook"}
      </button>
      <p className="text-xs text-brick-700/80">{remaining} of 3 downloads remaining</p>
      {status === "error" && <p className="text-sm text-red-500">{message}</p>}
    </div>
  );
}
