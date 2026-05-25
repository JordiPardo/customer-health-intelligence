import { ExperimentsView } from "@/components/views/experiments-view";
import { DEMO_PREFIX } from "@/lib/app-path";

export default function DemoExperimentsPage() {
  return <ExperimentsView base={DEMO_PREFIX} />;
}
