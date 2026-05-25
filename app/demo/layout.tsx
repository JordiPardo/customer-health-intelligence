import { AppShell } from "@/components/app/app-shell";
import { DEMO_PREFIX } from "@/lib/app-path";

export default function DemoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell base={DEMO_PREFIX}>{children}</AppShell>;
}
