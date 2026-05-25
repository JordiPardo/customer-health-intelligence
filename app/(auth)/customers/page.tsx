import { CustomerList } from "@/components/customers/customer-list";
import { getCustomers } from "@/lib/queries/customers";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1">Risk segments</h1>
        <p className="text-base text-[var(--muted)]">
          Customers ranked by 30-day churn risk from the Cox survival model.
        </p>
      </div>
      <CustomerList customers={customers} />
    </div>
  );
}
