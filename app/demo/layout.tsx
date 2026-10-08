import { AppShell } from "@/components/app/app-shell";
import { DEMO_PREFIX } from "@/lib/app-path";

// Re-fetch demo data hourly so a build-time Supabase outage never freezes
// an empty dashboard into the static output.
export const revalidate = 3600;

export default function DemoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell base={DEMO_PREFIX}>{children}</AppShell>;
}
