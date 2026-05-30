"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 3l1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8L12 3z"
        fill="currentColor"
      />
      <path
        d="M18.5 14.5l.8 2.1 2.2.8-2.2.8-.8 2.1-.8-2.1-2.2-.8 2.2-.8.8-2.1z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={index}
          className="font-semibold text-[var(--foreground)]"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function BriefMarkdown({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const isList = lines.every(
          (line) => line.trim().startsWith("-") || line.trim() === "",
        );

        if (isList) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {lines
                .filter((line) => line.trim().startsWith("-"))
                .map((line, i) => (
                  <li key={i}>{renderInline(line.replace(/^-\s*/, ""))}</li>
                ))}
            </ul>
          );
        }

        return (
          <p key={index}>{renderInline(block.replace(/\n/g, " "))}</p>
        );
      })}
    </div>
  );
}

export function RetentionBriefPanel({
  customerId,
  customerName,
  isDemo = false,
}: {
  customerId: string;
  customerName: string;
  isDemo?: boolean;
}) {
  const [brief, setBrief] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/retention-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, isDemo }),
      });

      const data = (await res.json()) as { brief?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate brief");
      }

      setBrief(data.brief ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!brief) return;
    await navigator.clipboard.writeText(brief);
  }

  return (
    <section className="ai-panel">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="ai-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-white">
            <SparkIcon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[var(--foreground)]">AI Copilot</h2>
              <span className="inline-flex items-center rounded-full border border-[rgb(99_102_241_/_0.25)] bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-dark)]">
                Beta
              </span>
            </div>
            <p className="mt-1 text-caption">
              Your AI retention analyst — reads every signal on this account and
              recommends the next move.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Generating…" : brief ? "Regenerate" : "Generate brief"}
          </Button>
          {brief && (
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              Copy
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--ai-border)]/60 px-5 py-4">
        {!brief && !error && !loading && (
          <p className="text-caption">
            Generate an executive-ready retention brief for{" "}
            <span className="font-medium text-[var(--foreground)]">
              {customerName}
            </span>{" "}
            — the risk, the drivers behind it, and the recommended play, written
            from the live account data on this page.
          </p>
        )}

        {loading && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--brand-dark)]">
              <SparkIcon className="h-3.5 w-3.5 animate-pulse" />
              Analyzing account signals…
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-[var(--ai-muted)]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--ai-muted)]" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-[var(--ai-muted)]" />
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3.5 py-2.5 text-xs text-[var(--danger)]">
            {error}
          </div>
        )}

        {brief && !loading && (
          <div className="animate-fade-up">
            <BriefMarkdown content={brief} />
            <p className="mt-4 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <SparkIcon className="h-3 w-3 text-[var(--ai)]" />
              Assistive AI — verify against model scores and experiment results
              before customer outreach.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
