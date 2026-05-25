import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-base font-medium text-[var(--foreground)]">
            Customer health intelligence
          </span>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-base text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Sign in
            </Link>
            <Link href="/signup">
              <Button>Start free trial</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-1 flex-col justify-center px-6 py-20">
        <p className="mb-4 text-[13px] text-[var(--muted)]">
          SaaS operations intelligence
        </p>
        <h1 className="mb-6 max-w-2xl text-[22px] font-medium leading-snug text-[var(--foreground)]">
          Predict which customers will churn—and when
        </h1>
        <p className="mb-10 max-w-xl text-base text-[var(--muted)]">
          Survival analysis estimates days-to-churn with confidence intervals.
          Causal inference measures what actually moves retention. Built for
          revenue and customer success teams who need more than a risk score.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup">
            <Button>Start free trial</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">View demo</Button>
          </Link>
        </div>

        <ul className="mt-16 grid gap-8 border-t border-[var(--border)] pt-12 sm:grid-cols-3">
          <li>
            <h3 className="mb-2 text-[16px] font-medium">Risk dashboard</h3>
            <p className="text-base text-[var(--muted)]">
              Segment customers by 30-day churn risk and days-to-churn.
            </p>
          </li>
          <li>
            <h3 className="mb-2 text-[16px] font-medium">Survival curves</h3>
            <p className="text-base text-[var(--muted)]">
              Kaplan–Meier curves with confidence bands per account.
            </p>
          </li>
          <li>
            <h3 className="mb-2 text-[16px] font-medium">Treatment effects</h3>
            <p className="text-base text-[var(--muted)]">
              Causal estimates for retention playbooks by segment.
            </p>
          </li>
        </ul>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-6 py-6 text-[13px] text-[var(--muted)]">
          Portfolio project — synthetic data demo
        </div>
      </footer>
    </div>
  );
}
