"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CustomerWithRisk } from "@/lib/types";
import { getRiskLevel } from "@/lib/risk";
import { RiskBadge } from "@/components/ui/risk-badge";

type RiskFilter = "all" | "high" | "medium" | "low";

export function CustomerList({ customers }: { customers: CustomerWithRisk[] }) {
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

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-md border border-[var(--border)] px-3 py-2 text-base"
        />
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-base"
        >
          <option value="all">All risk levels</option>
          <option value="high">High risk</option>
          <option value="medium">Medium risk</option>
          <option value="low">Low risk</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-base">
          <thead className="border-b border-[var(--border)] bg-gray-50">
            <tr>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("name")}>
                Name
              </th>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("mrr")}>
                MRR
              </th>
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("risk")}>
                30d risk
              </th>
              <th className="px-4 py-3 font-medium">Days to churn</th>
              <th className="px-4 py-3 font-medium">Segment</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/customers/${c.id}`}
                    className="font-medium text-[var(--primary)] hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">${c.mrr.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <RiskBadge score={c.churn_risk_30d} />
                    <span className="text-[13px] text-[var(--muted)]">
                      {(c.churn_risk_30d * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {c.median_days_to_churn ?? "—"}
                </td>
                <td className="px-4 py-3">{c.segment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[13px] text-[var(--muted)]">
        {filtered.length} of {customers.length} customers
      </p>
    </div>
  );
}
