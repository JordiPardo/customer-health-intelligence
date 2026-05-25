import { CustomerList } from "@/components/customers/customer-list";
import { PageToolbar, StatusBadge } from "@/components/app/page-toolbar";
import { type AppBase } from "@/lib/app-path";
import { getCustomers } from "@/lib/queries/customers";
import { getRiskLevel } from "@/lib/risk";

export async function CustomersView({ base = "" }: { base?: AppBase }) {
  const customers = await getCustomers();
  const highCount = customers.filter((c) => getRiskLevel(c.churn_risk_30d) === "high").length;

  return (
    <div className="space-y-5">
      <PageToolbar
        title="Customers"
        description="Search and sort accounts by churn risk, MRR, and segment."
        meta={
          <>
            <StatusBadge>{customers.length} accounts</StatusBadge>
            <StatusBadge variant="warning">{highCount} high risk</StatusBadge>
          </>
        }
      />
      <CustomerList customers={customers} base={base} />
    </div>
  );
}
