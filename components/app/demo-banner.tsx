import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-40 border-b border-[var(--warning)]/20 bg-[var(--warning-muted)] px-4 py-2 text-center text-xs text-[var(--warning)]">
      <span className="font-semibold">Demo mode</span>
      <span className="mx-1.5 text-[var(--muted)]">·</span>
      Read-only preview with synthetic data.
      <Link
        href="/signup"
        className="ml-1.5 font-medium underline underline-offset-2 hover:text-[var(--foreground)]"
      >
        Create account
      </Link>
    </div>
  );
}
