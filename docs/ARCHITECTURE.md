# Architecture

## Overview

Customer Health Intelligence is a **Next.js full-stack SaaS demo** backed by **Supabase (PostgreSQL + Auth)** with **Python ML pipelines** that populate analytics tables.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  Next.js App Router (React 19, Tailwind)                    │
│  /  /methodology  /demo/*  /dashboard  /customers  …        │
└───────────────────────────┬─────────────────────────────────┘
                            │ Server Components + middleware
┌───────────────────────────▼─────────────────────────────────┐
│  Supabase                                                    │
│  PostgreSQL · Auth · Row Level Security · REST API           │
└───────────────────────────▲─────────────────────────────────┘
                            │ Service role (scripts + server reads)
┌───────────────────────────┴─────────────────────────────────┐
│  Python pipelines (local / CI)                               │
│  generate → seed → Cox survival → causal ATE → experiments   │
└─────────────────────────────────────────────────────────────┘
```

## Frontend layers

| Layer | Location | Role |
|-------|----------|------|
| Routes | `app/(public)`, `app/(auth)`, `app/demo` | URL structure, layouts |
| Views | `components/views/*` | Page-level server components |
| UI | `components/ui/*` | Cards, buttons, badges, inputs |
| Charts | `components/charts/*` | Plotly visualizations |
| Queries | `lib/queries/*` | Supabase data access |

**Public routes** — landing, methodology, login/signup, read-only demo at `/demo/*`.

**Authenticated routes** — same views with `base=""`; middleware redirects unauthenticated users to `/login`.

## Data access pattern

Server components call `getDemoDb()` (`lib/queries/db.ts`), which uses the **Supabase service role** for reads. Auth is enforced in middleware and `(auth)` layout; RLS is enabled on tables but bypassed for the portfolio demo org.

Production hardening would replace service-role reads with **org-scoped RLS** using the user's JWT.

## Database (Supabase)

Core tables:

- **customers** — account attributes (MRR, segment, cohort)
- **usage_events**, **payment_events**, **support_sentiment** — telemetry
- **churn_labels** — outcome labels for ML
- **survival_predictions** — Cox model outputs per customer
- **causal_estimates** — playbook ATE by segment
- **experiments**, **experiment_assignments**, **experiment_results** — A/B tests
- **cohort_anomalies** — flagged cohort deviations
- **organizations**, **organization_members** — multi-tenant scaffold

Migrations live in `supabase/migrations/`.

## ML pipelines

| Script | Output |
|--------|--------|
| `generate_synthetic_data.py` | CSVs in `data/synthetic/` |
| `seed_supabase.py` | Loads CSVs into Postgres |
| `run_ml_pipeline.py` | `survival_predictions` (Cox PH) |
| `run_causal_pipeline.py` | `causal_estimates` (OLS + bootstrap) |
| `run_experiments_pipeline.py` | A/B experiment seed data |

Pipelines run **locally** (or via future CI); Vercel serves the UI only.

## Deployment

- **Vercel** — Next.js app, env vars for Supabase keys
- **Supabase** — hosted Postgres + Auth
- See [DEPLOYMENT.md](./DEPLOYMENT.md)

## Key design decisions

1. **Survival over classification** — time-to-churn is actionable for CS workflows.
2. **Observational + experimental** — playbooks (ATE) plus A/B validation.
3. **Demo org** — single tenant for portfolio; all sign-ups join demo org via DB trigger.
4. **No API routes yet** — direct Supabase reads keep the stack simple for a demo.
