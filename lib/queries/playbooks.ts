import { DEMO_ORG_ID, getDemoDb } from "@/lib/queries/db";
import { playbookAction, playbookLabel, PLAYBOOK_META } from "@/lib/playbooks";
import type { CausalEstimate, PlaybookRow } from "@/lib/types";

function enrich(row: CausalEstimate): PlaybookRow {
  const meta = PLAYBOOK_META[row.treatment];
  return {
    ...row,
    label: meta?.label ?? playbookLabel(row.treatment),
    description: meta?.description ?? "",
    action: meta?.action ?? playbookAction(row.treatment),
  };
}

export async function getPlaybooks(): Promise<PlaybookRow[]> {
  const supabase = getDemoDb();
  const { data, error } = await supabase
    .from("causal_estimates")
    .select(
      "id, treatment, segment, ate, confidence_lower, confidence_upper, sample_size",
    )
    .eq("organization_id", DEMO_ORG_ID)
    .order("segment")
    .order("ate", { ascending: false });

  if (error) {
    console.error("getPlaybooks", error);
    return [];
  }

  return (data ?? []).map((row) =>
    enrich({
      id: row.id as string,
      treatment: row.treatment as string,
      segment: row.segment as string,
      ate: Number(row.ate),
      confidence_lower: Number(row.confidence_lower),
      confidence_upper: Number(row.confidence_upper),
      sample_size: Number(row.sample_size),
    }),
  );
}

export async function getPlaybooksForSegment(
  segment: string,
): Promise<PlaybookRow[]> {
  const all = await getPlaybooks();
  return all
    .filter((p) => p.segment === segment)
    .sort((a, b) => b.ate - a.ate);
}

export async function getTopPlaybooksForSegment(
  segment: string,
  limit = 3,
): Promise<PlaybookRow[]> {
  const beneficial = (await getPlaybooksForSegment(segment)).filter(
    (p) => p.ate > 0,
  );
  return beneficial.slice(0, limit);
}
