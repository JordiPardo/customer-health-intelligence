import { CustomersView } from "@/components/views/customers-view";
import { DEMO_PREFIX } from "@/lib/app-path";

export default function DemoCustomersPage() {
  return <CustomersView base={DEMO_PREFIX} />;
}
