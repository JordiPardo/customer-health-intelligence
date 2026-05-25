import { CustomerList } from "@/components/customers/customer-list";
import { PageHeader } from "@/components/ui/page-header";
import { type AppBase } from "@/lib/app-path";
import { getCustomers } from "@/lib/queries/customers";

export async function CustomersView({ base = "" }: { base?: AppBase }) {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Accounts ranked by 30-day churn risk from the Cox survival model."
      />
      <CustomerList customers={customers} base={base} />
    </div>
  );
}
