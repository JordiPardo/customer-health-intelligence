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
