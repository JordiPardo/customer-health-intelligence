import { ExperimentDetailView } from "@/components/views/experiment-detail-view";
import { DEMO_PREFIX } from "@/lib/app-path";

export default async function DemoExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExperimentDetailView id={id} base={DEMO_PREFIX} />;
}
