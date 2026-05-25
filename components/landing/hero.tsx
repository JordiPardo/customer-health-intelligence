import Link from "next/link";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { LandingSections } from "@/components/landing/landing-sections";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
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

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-16">
            <div>
              <p className="text-label mb-3">SaaS operations intelligence</p>
              <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.5rem] lg:leading-[1.15]">
                Predict which customers will churn—and when
              </h1>
              <p className="mb-6 max-w-lg text-sm leading-relaxed text-[var(--muted)] sm:text-base">
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
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--muted)]">
                <span>✓ Cox survival model</span>
                <span>✓ Cohort anomaly detection</span>
                <span>✓ Causal playbooks</span>
              </div>
            </div>
            <div className="lg:pl-2">
              <DashboardPreview />
            </div>
          </div>
        </section>

        <LandingSections />
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-[var(--muted)]">
          <span>Customer health intelligence</span>
          <span>Portfolio demo · synthetic data</span>
        </div>
      </footer>
    </div>
  );
}
