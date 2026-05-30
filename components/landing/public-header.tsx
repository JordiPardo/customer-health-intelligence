import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PublicHeader({ active }: { active?: "home" | "methodology" }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-[var(--foreground)]"
        >
          Customer health
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/methodology">
            <Button
              variant={active === "methodology" ? "secondary" : "ghost"}
              size="sm"
            >
              Methodology
            </Button>
          </Link>
          <Link href="/demo/dashboard">
            <Button variant="ghost" size="sm">
              Demo
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Start free trial</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-[var(--muted)]">
        <span>Customer health intelligence</span>
        <div className="flex gap-4">
          <Link href="/methodology" className="hover:text-[var(--foreground)]">
            Methodology
          </Link>
          <Link href="/demo/dashboard" className="hover:text-[var(--foreground)]">
            Live demo
          </Link>
        </div>
      </div>
    </footer>
  );
}
