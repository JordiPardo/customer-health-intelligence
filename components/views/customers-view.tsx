import { CustomerList } from "@/components/customers/customer-list";
import { PageToolbar, StatusBadge } from "@/components/app/page-toolbar";
import { type AppBase } from "@/lib/app-path";
import { getCustomers } from "@/lib/queries/customers";
import { expectedMrrAtRisk, getRiskLevel, RISK_THRESHOLDS } from "@/lib/risk";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export async function CustomersView({ base = "" }: { base?: AppBase }) {
  const customers = await getCustomers();
  const highRisk = customers.filter(
    (c) => getRiskLevel(c.churn_risk_90d) === "high",
  );
  const highCount = highRisk.length;
  const totalMrr = customers.reduce((sum, c) => sum + c.mrr, 0);
  const atRiskMrr = expectedMrrAtRisk(customers);

  return (
    <div className="space-y-5">
      <PageToolbar
        title="Customers"
        question="Which accounts need attention right now?"
        description="Every account ranked by churn risk and revenue exposure — triage the portfolio in one view."
        meta={
          <>
            <StatusBadge>{customers.length} active accounts</StatusBadge>
            <StatusBadge variant="warning">{highCount} high risk</StatusBadge>
          </>
        }
      />

      <div className="grid animate-fade-up gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-tile px-4 py-3.5">
          <p className="text-label">Total MRR</p>
          <p className="mt-1.5 text-stat">{formatCurrency(totalMrr)}</p>
          <p className="mt-1 text-caption">Across {customers.length} accounts</p>
        </div>
        <div className="stat-tile relative overflow-hidden px-4 py-3.5 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--danger)]">
          <p className="text-label">Expected MRR at risk · 90d</p>
          <p className="mt-1.5 text-stat text-[var(--danger)]">
            {formatCurrency(atRiskMrr)}
          </p>
          <p className="mt-1 text-caption">
            {totalMrr > 0 ? ((atRiskMrr / totalMrr) * 100).toFixed(1) : 0}% of MRR,
            probability-weighted
          </p>
        </div>
        <div className="stat-tile px-4 py-3.5">
          <p className="text-label">High-risk accounts</p>
          <p className="mt-1.5 text-stat text-[var(--danger)]">{highCount}</p>
          <p className="mt-1 text-caption">
            90-day churn risk ≥ {RISK_THRESHOLDS.high * 100}%
          </p>
        </div>
        <div className="stat-tile px-4 py-3.5">
          <p className="text-label">Healthy accounts</p>
          <p className="mt-1.5 text-stat text-[var(--success)]">
            {customers.length - highCount}
          </p>
          <p className="mt-1 text-caption">Low or medium risk</p>
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <CustomerList customers={customers} base={base} />
      </div>
    </div>
  );
}
