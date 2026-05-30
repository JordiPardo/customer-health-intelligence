"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle
          subtitle="LLM summary from survival risk, drivers, and causal playbooks — traced in Langfuse"
        >
          AI retention brief
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating…" : brief ? "Regenerate" : "Generate brief"}
          </Button>
          {brief && (
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              Copy
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!brief && !error && !loading && (
          <p className="text-caption">
            One-click brief for <span className="font-medium">{customerName}</span>{" "}
            — grounded in account metrics already on this page. Requires OpenAI +
            Langfuse env vars on the server.
          </p>
        )}

        {loading && (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-[var(--border)]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-[var(--border)]" />
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3.5 py-2.5 text-xs text-[var(--danger)]">
            {error}
          </div>
        )}

        {brief && !loading && <BriefMarkdown content={brief} />}

        {brief && (
          <p className="mt-4 text-[11px] text-[var(--muted)]">
            Assistive AI — verify against model scores and experiment results before
            customer outreach.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
