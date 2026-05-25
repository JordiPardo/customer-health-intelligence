import Link from "next/link";
import { DemoBanner } from "@/components/app/demo-banner";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Button } from "@/components/ui/button";
import { appPath, type AppBase } from "@/lib/app-path";

export function AppShell({
  children,
  base = "",
}: {
  children: React.ReactNode;
  base?: AppBase;
}) {
  const isDemo = base === "/demo";
  const homeHref = appPath(base, "/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {isDemo && <DemoBanner />}

      <div className="flex min-h-0 flex-1">
        <aside
          className={`fixed left-0 z-30 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex ${
            isDemo ? "top-9 bottom-0" : "inset-y-0"
          }`}
        >
          <div className="border-b border-[var(--border)] px-4 py-3.5">
            <Link
              href={homeHref}
              className="block truncate text-sm font-semibold tracking-tight text-[var(--foreground)]"
            >
              Customer health
            </Link>
            <p className="mt-1 truncate text-[11px] text-[var(--muted)]">
              {isDemo ? "Demo organization" : "Your workspace"}
            </p>
          </div>

          <div className="flex flex-1 flex-col py-3">
            <p className="px-4 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
              Analytics
            </p>
            <SidebarNav base={base} />
          </div>

          <div className="shrink-0 border-t border-[var(--border)] p-3">
            {isDemo ? (
              <div className="space-y-2">
                <Link
                  href="/"
                  className="block px-2.5 py-1.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                >
                  ← Back to home
                </Link>
                <Link href="/signup" className="block">
                  <Button size="sm" className="w-full">
                    Sign up
                  </Button>
                </Link>
              </div>
            ) : (
              <SignOutButton />
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col md:pl-60">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur-md md:hidden">
            <Link href={homeHref} className="text-sm font-semibold tracking-tight">
              Customer health
            </Link>
            <MobileNav base={base} isDemo={isDemo} />
          </header>

          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function MobileNav({ base, isDemo }: { base: AppBase; isDemo: boolean }) {
  const items = [
    { suffix: "/dashboard", label: "Dashboard" },
    { suffix: "/customers", label: "Customers" },
    { suffix: "/playbooks", label: "Playbooks" },
    { suffix: "/experiments", label: "Experiments" },
  ] as const;

  return (
    <nav className="flex items-center gap-0.5">
      {items.map((item) => (
        <Link
          key={item.suffix}
          href={appPath(base, item.suffix)}
          className="rounded-[var(--radius)] px-2 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)]"
        >
          {item.label}
        </Link>
      ))}
      {isDemo ? (
        <Link href="/signup" className="ml-1">
          <Button size="sm">Sign up</Button>
        </Link>
      ) : (
        <SignOutButton compact />
      )}
    </nav>
  );
}
