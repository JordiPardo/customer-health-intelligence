# Customer health intelligence

SaaS operations intelligence platform that predicts **when** customers will churn, explains **why** with causal inference, and tracks intervention effectiveness.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **ML:** Python (pandas, lifelines, scikit-learn)

## Security

- Copy `.env.example` to `.env.local` and add your own Supabase keys locally.
- **Never commit** `.env.local`, database passwords, or service role keys.
- Use a **private** GitHub repo if you prefer; this project is designed to run against your own Supabase project.

## Quick start

### 1. Environment variables

```bash
cp .env.example .env.local
```

Fill in from [Supabase](https://supabase.com/dashboard) → Project Settings → API:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. Database schema

In Supabase → **SQL Editor**, paste and run:

`supabase/migrations/001_initial_schema.sql`

### 3. Install and run the app

```bash
npm install   # or pnpm install if pnpm works on your machine
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Python environment and synthetic data

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

python scripts/generate_synthetic_data.py
python scripts/seed_supabase.py --postgres
```

### 5. Train survival model (Phase 2)

```bash
python scripts/run_ml_pipeline.py --replace
```

This trains a **Cox proportional hazards** model on your seeded data and writes 500 rows to `survival_predictions`. Outputs also saved to `data/synthetic/survival_predictions.csv`.

Explore interactively: `notebooks/01_survival_analysis.ipynb`

### 6. Causal playbooks (Phase 4)

```bash
python scripts/run_causal_pipeline.py --replace
```

Estimates average treatment effects (OLS-adjusted + bootstrap) per retention playbook and segment, then writes to `causal_estimates`. Outputs also saved to `data/synthetic/causal_estimates.csv`.

### 7. Run the app (Phase 3–4)

```bash
npm run dev
```

- Landing: http://localhost:3000
- Sign up: http://localhost:3000/signup (adds you to the demo org via DB trigger)
- Dashboard: http://localhost:3000/dashboard
- Playbooks: http://localhost:3000/playbooks

In Supabase → **Authentication → Providers**, ensure **Email** is enabled. For local dev, you can disable **Confirm email** under Email settings so sign-up works instantly.

## Project structure

```
app/(public)/     # Landing page
app/(auth)/       # Authenticated app (Phase 3+)
app/api/          # API routes
components/       # React components
lib/supabase/     # Supabase clients
ml/               # ML pipeline (feature engineering, Cox survival model)
notebooks/        # Jupyter notebooks documenting ML process
scripts/          # Data generation and seeding
supabase/         # SQL migrations
data/synthetic/   # Generated CSVs (gitignored)
```

## Demo organization

Synthetic data is scoped to demo org `Acme analytics demo` (`00000000-0000-4000-8000-000000000001`). New sign-ups are auto-added to this org via a database trigger (portfolio demo).

## Deploy (Vercel)

Host the app so it runs without `npm run dev` on your machine. Supabase is already cloud-hosted.

**Full checklist:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

1. Import the GitHub repo on [Vercel](https://vercel.com/new)
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. In Supabase → **Authentication** → **URL configuration**, add your Vercel URL and `http://localhost:3000/**` to redirect URLs
4. Deploy; smoke-test signup, dashboard, customers, playbooks

## Development phases

See your project spec for the full 10–12 week roadmap. **Phases 1–4** are in place (foundation, survival ML, auth + dashboard, causal playbooks). Next: **Phase 5** A/B experiments.
