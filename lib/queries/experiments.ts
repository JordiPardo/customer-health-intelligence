import { DEMO_ORG_ID, getDemoDb } from "@/lib/queries/db";
import { playbookLabel } from "@/lib/playbooks";
import type { ExperimentResult, ExperimentRow, ExperimentStatus } from "@/lib/types";

function enrichExperiment(
  row: Record<string, unknown>,
  counts: { treatment: number; control: number },
  result: ExperimentResult | null,
): ExperimentRow {
  const treatment = (row.treatment as string | null) ?? null;
  return {
    id: row.id as string,
    name: row.name as string,
    treatment,
    segment: (row.segment as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    status: row.status as ExperimentStatus,
    started_at: row.started_at as string,
    ended_at: (row.ended_at as string | null) ?? null,
    treatment_count: counts.treatment,
    control_count: counts.control,
    result,
    label: treatment ? playbookLabel(treatment) : (row.name as string),
  };
}

async function assignmentCounts(experimentIds: string[]) {
  const supabase = getDemoDb();
  const map = new Map<string, { treatment: number; control: number }>();

  if (experimentIds.length === 0) return map;

  const { data, error } = await supabase
    .from("experiment_assignments")
    .select('experiment_id, "group"')
    .in("experiment_id", experimentIds);

  if (error) {
    console.error("assignmentCounts", error);
    return map;
  }

  for (const id of experimentIds) {
    map.set(id, { treatment: 0, control: 0 });
  }

  for (const row of data ?? []) {
    const id = row.experiment_id as string;
    const entry = map.get(id) ?? { treatment: 0, control: 0 };
    if (row.group === "treatment") entry.treatment += 1;
    else entry.control += 1;
    map.set(id, entry);
  }

  return map;
}

async function resultsByExperiment(experimentIds: string[]) {
  const supabase = getDemoDb();
  const map = new Map<string, ExperimentResult>();

  if (experimentIds.length === 0) return map;

  const { data, error } = await supabase
    .from("experiment_results")
    .select(
      "experiment_id, treatment_churn_rate, control_churn_rate, uplift_pct, p_value",
    )
    .in("experiment_id", experimentIds);

  if (error) {
    console.error("resultsByExperiment", error);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.experiment_id as string, {
      treatment_churn_rate: Number(row.treatment_churn_rate),
      control_churn_rate: Number(row.control_churn_rate),
      uplift_pct: Number(row.uplift_pct),
      p_value: Number(row.p_value),
    });
  }

  return map;
}

export async function getExperiments(): Promise<ExperimentRow[]> {
  const supabase = getDemoDb();
  const { data, error } = await supabase
    .from("experiments")
    .select(
      "id, name, treatment, segment, description, status, started_at, ended_at",
    )
    .eq("organization_id", DEMO_ORG_ID)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("getExperiments", error);
    return [];
  }

  const ids = (data ?? []).map((r) => r.id as string);
  const [counts, results] = await Promise.all([
    assignmentCounts(ids),
    resultsByExperiment(ids),
  ]);

  return (data ?? []).map((row) =>
    enrichExperiment(
      row,
      counts.get(row.id as string) ?? { treatment: 0, control: 0 },
      results.get(row.id as string) ?? null,
    ),
  );
}

export async function getExperimentById(
  id: string,
): Promise<ExperimentRow | null> {
  const supabase = getDemoDb();
  const { data, error } = await supabase
    .from("experiments")
    .select(
      "id, name, treatment, segment, description, status, started_at, ended_at",
    )
    .eq("organization_id", DEMO_ORG_ID)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getExperimentById", error);
    return null;
  }

  const [counts, results] = await Promise.all([
    assignmentCounts([id]),
    resultsByExperiment([id]),
  ]);

  return enrichExperiment(
    data,
    counts.get(id) ?? { treatment: 0, control: 0 },
    results.get(id) ?? null,
  );
}

/** Match completed/running experiments to a playbook treatment + segment. */
export async function getExperimentsForPlaybook(
  treatment: string,
  segment: string,
): Promise<ExperimentRow[]> {
  const all = await getExperiments();
  return all.filter(
    (e) => e.treatment === treatment && e.segment === segment,
  );
}
