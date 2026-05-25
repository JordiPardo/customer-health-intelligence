import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <span className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
            Customer health
          </span>
          <nav className="flex items-center gap-2">
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

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16 sm:py-24">
        <p className="text-label mb-4">SaaS operations intelligence</p>
        <h1 className="mb-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Predict which customers will churn—and when
        </h1>
        <p className="mb-10 max-w-xl text-base leading-relaxed text-[var(--muted)]">
          Survival analysis estimates days-to-churn with confidence intervals.
          Causal inference measures what actually moves retention. Built for
          revenue and customer success teams who need more than a risk score.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup">
            <Button>Start free trial</Button>
          </Link>
          <Link href="/demo/dashboard">
            <Button variant="secondary">View demo</Button>
          </Link>
        </div>

        <ul className="mt-20 grid gap-8 border-t border-[var(--border)] pt-12 sm:grid-cols-3">
          <li>
            <h3 className="mb-2">Risk dashboard</h3>
            <p className="text-caption">
              Segment customers by 30-day churn risk and days-to-churn.
            </p>
          </li>
          <li>
            <h3 className="mb-2">Survival curves</h3>
            <p className="text-caption">
              Kaplan–Meier curves with confidence bands per account.
            </p>
          </li>
          <li>
            <h3 className="mb-2">Treatment effects</h3>
            <p className="text-caption">
              Causal estimates for retention playbooks by segment.
            </p>
          </li>
        </ul>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-6 py-5 text-xs text-[var(--muted)]">
          Portfolio project — synthetic data demo
        </div>
      </footer>
    </div>
  );
}
