"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { appPath, type AppBase } from "@/lib/app-path";
import type { CustomerWithRisk } from "@/lib/types";
import { getRiskLevel } from "@/lib/risk";
import { RiskBadge } from "@/components/ui/risk-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";

type RiskFilter = "all" | "high" | "medium" | "low";

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

  const filtered = useMemo(() => {
    let list = customers.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()),
    );
    if (riskFilter !== "all") {
      list = list.filter((c) => getRiskLevel(c.churn_risk_30d) === riskFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "mrr") cmp = a.mrr - b.mrr;
      else cmp = a.churn_risk_30d - b.churn_risk_30d;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [customers, search, riskFilter, sortKey, sortDir]);

  function toggleSort(key: typeof sortKey) {
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
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 sm:max-w-xs"
        />
        <Select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
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
                    30d risk{sortIndicator("risk")}
                  </th>
                  <th className="px-5 py-3">Days to churn</th>
                  <th className="px-5 py-3">Segment</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
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
                      ${c.mrr.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <RiskBadge score={c.churn_risk_30d} />
                        <span className="text-xs tabular-nums text-[var(--muted)]">
                          {(c.churn_risk_30d * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-[var(--muted)]">
                      {c.median_days_to_churn ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--muted)]">{c.segment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--muted)]">
        Showing {filtered.length} of {customers.length} customers
      </p>
    </div>
  );
}
