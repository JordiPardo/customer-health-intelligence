import { DashboardView } from "@/components/views/dashboard-view";
import { DEMO_PREFIX } from "@/lib/app-path";

export default function DemoDashboardPage() {
  return <DashboardView base={DEMO_PREFIX} />;
}
