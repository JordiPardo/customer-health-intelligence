import Link from "next/link";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { LandingSections } from "@/components/landing/landing-sections";
import { PublicFooter, PublicHeader } from "@/components/landing/public-header";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <PublicHeader />

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
            <div className="animate-fade-up">
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
              <p className="mt-4 text-xs text-[var(--muted)]">
                <Link href="/methodology" className="text-[var(--accent)] hover:underline">
                  Read the methodology case study →
                </Link>
              </p>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--muted)]">
                <span>✓ Cox survival model</span>
                <span>✓ Cohort anomaly detection</span>
                <span>✓ Causal playbooks</span>
              </div>
            </div>
            <div className="animate-fade-up lg:pl-2" style={{ animationDelay: "120ms" }}>
              <DashboardPreview />
            </div>
          </div>
        </section>

        <LandingSections />
      </main>

      <PublicFooter />
    </div>
  );
}
