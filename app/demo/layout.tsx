import { AppShell } from "@/components/app/app-shell";
import { DEMO_PREFIX } from "@/lib/app-path";

// Always render demo pages from live data. Static/ISR output froze an empty
// dashboard when Supabase was paused at build time, and Next's data cache
// (which survives deploys) served stale customer ids after a data refresh.
export const dynamic = "force-dynamic";

export default function DemoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell base={DEMO_PREFIX}>{children}</AppShell>;
}
