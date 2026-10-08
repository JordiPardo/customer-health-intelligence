"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { appPath, type AppBase } from "@/lib/app-path";
import type { CustomerWithRisk } from "@/lib/types";
import { formatUsd, getRiskLevel } from "@/lib/risk";
import { RiskBadge } from "@/components/ui/risk-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";

type RiskFilter = "all" | "high" | "medium" | "low";

const PAGE_SIZE = 50;

export function CustomerList({
  customers,
  base = "",
}: {
  customers: CustomerWithRisk[];
  base?: AppBase;
}) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [sortKey, setSortKey] = useState<"name" | "mrr" | "risk">("risk");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let list = customers.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()),
    );
    if (riskFilter !== "all") {
      list = list.filter((c) => getRiskLevel(c.churn_risk_90d) === riskFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "mrr") cmp = a.mrr - b.mrr;
      else cmp = a.churn_risk_90d - b.churn_risk_90d;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [customers, search, riskFilter, sortKey, sortDir]);

  function toggleSort(key: typeof sortKey) {
    setVisible(PAGE_SIZE);
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortIndicator = (key: typeof sortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          type="search"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          className="min-w-[200px] flex-1 sm:max-w-xs"
        />
        <Select
          value={riskFilter}
          onChange={(e) => {
            setRiskFilter(e.target.value as RiskFilter);
            setVisible(PAGE_SIZE);
          }}
          className="w-full sm:w-auto sm:min-w-[160px]"
        >
          <option value="all">All risk levels</option>
          <option value="high">High risk</option>
          <option value="medium">Medium risk</option>
          <option value="low">Low risk</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No customers match"
          description="Try adjusting your search or filter criteria."
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-shell w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th
                    className="cursor-pointer px-5 py-3 select-none"
                    onClick={() => toggleSort("name")}
                  >
                    Name{sortIndicator("name")}
                  </th>
                  <th
                    className="cursor-pointer px-5 py-3 select-none"
                    onClick={() => toggleSort("mrr")}
                  >
                    MRR{sortIndicator("mrr")}
                  </th>
                  <th
                    className="cursor-pointer px-5 py-3 select-none"
                    onClick={() => toggleSort("risk")}
                  >
                    90d risk{sortIndicator("risk")}
                  </th>
                  <th className="px-5 py-3">30d risk</th>
                  <th className="px-5 py-3">Segment</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, visible).map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={appPath(base, `/customers/${c.id}`)}
                        className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums">
                      {formatUsd(c.mrr)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <RiskBadge score={c.churn_risk_90d} />
                        <span className="text-xs tabular-nums text-[var(--muted)]">
                          {(c.churn_risk_90d * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-[var(--muted)]">
                      {(c.churn_risk_30d * 100).toFixed(0)}%
                    </td>
                    <td className="px-5 py-3.5 text-[var(--muted)]">{c.segment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">
          Showing {Math.min(visible, filtered.length)} of {filtered.length} matching ·{" "}
          {customers.length} active customers
        </p>
        {visible < filtered.length && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="inline-flex h-8 items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--border-subtle)]"
          >
            Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
          </button>
        )}
      </div>
    </div>
  );
}
