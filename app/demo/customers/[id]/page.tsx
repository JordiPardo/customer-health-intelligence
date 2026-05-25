import { CustomerDetailView } from "@/components/views/customer-detail-view";
import { DEMO_PREFIX } from "@/lib/app-path";

export default async function DemoCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerDetailView id={id} base={DEMO_PREFIX} />;
}
