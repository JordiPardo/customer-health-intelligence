import { ExperimentDetailView } from "@/components/views/experiment-detail-view";

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExperimentDetailView id={id} />;
}
