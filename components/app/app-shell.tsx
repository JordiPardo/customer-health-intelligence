import Link from "next/link";
import { DemoBanner } from "@/components/app/demo-banner";
import { SignOutButton } from "@/components/app/sign-out-button";
import { appPath, type AppBase } from "@/lib/app-path";

const NAV_SUFFIXES = [
  { suffix: "/dashboard", label: "Dashboard" },
  { suffix: "/customers", label: "Customers" },
  { suffix: "/playbooks", label: "Playbooks" },
] as const;

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
    <div className="min-h-full">
      {isDemo && <DemoBanner />}
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href={homeHref}
              className="text-base font-medium text-[var(--foreground)]"
            >
              Customer health intelligence
            </Link>
            <nav className="flex gap-4">
              {NAV_SUFFIXES.map((item) => (
                <Link
                  key={item.suffix}
                  href={appPath(base, item.suffix)}
                  className="text-base text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          {isDemo ? (
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-base text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Home
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
              >
                Sign up
              </Link>
            </div>
          ) : (
            <SignOutButton />
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
