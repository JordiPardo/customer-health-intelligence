import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_ORG_ID } from "@/lib/constants";

/**
 * Server-side data access for the demo org.
 * Auth is enforced in app/(auth)/layout; reads use service role so RLS
 * membership issues don't block the portfolio demo.
 */
export function getDemoDb() {
  return createAdminClient();
}

export { DEMO_ORG_ID };

const PAGE_SIZE = 1000;

/**
 * PostgREST caps each response (1,000 rows by default), so large selects are
 * fetched page by page. `page` must apply a stable order before `.range()`.
 */
export async function fetchAllRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[]; error: unknown }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}
