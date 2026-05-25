# Deploy to Vercel (always-on demo)

The Next.js app runs on Vercel; Supabase stays your backend. ML scripts still run locally (or via CI later)—data is already in Supabase.

## Prerequisites

- [x] Phases 1–4 working locally
- [x] Repo on GitHub: `JordiPardo/customer-health-intelligence`
- [x] Supabase project with schema, seed data, ML predictions, and causal estimates

## 1. Connect Vercel to GitHub

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import **customer-health-intelligence**
3. Framework: **Next.js** (auto-detected)
4. Root directory: `.` (default)
5. Build command: `npm run build` (default)
6. Output: default for Next.js

Do **not** deploy until environment variables are set (step 2).

## 2. Environment variables (Vercel)

In the project → **Settings** → **Environment Variables**, add for **Production** (and Preview if you want):

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_REF.supabase.co` | Same as local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | Supabase → API |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key | Server-only; never expose to client |

Copy from your local `.env.local`. Do not paste these into the repo.

Optional after first deploy:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | Custom domain or production URL |

## 3. Supabase Auth URLs

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL configuration**:

1. **Site URL** — set to your Vercel URL, e.g.  
   `https://customer-health-intelligence.vercel.app`

2. **Redirect URLs** — add (replace with your real host):

   ```
   https://customer-health-intelligence.vercel.app/**
   https://customer-health-intelligence-*.vercel.app/**
   http://localhost:3000/**
   ```

   Preview deployments use `*-*.vercel.app`; the wildcard entry covers them.

3. **Email provider** — enabled.

4. For portfolio demos: **Authentication** → **Email** → disable **Confirm email** so sign-up works without inbox verification.

## 4. Deploy

- **Git integration:** push to `main` → Vercel deploys automatically.
- **CLI:** `npx vercel` (first time: link project, add env vars in dashboard).

## 5. Smoke test (production)

After deploy:

1. Open `/` — landing loads
2. `/signup` — create a test account
3. `/dashboard` — 500 customers, risk metrics, chart
4. `/customers` — list loads
5. `/playbooks` — 12 causal estimate rows
6. Sign out and confirm `/dashboard` redirects to `/login`

## 6. Troubleshooting

| Issue | Fix |
|--------|-----|
| Login redirects to localhost | Fix Supabase Site URL + Redirect URLs (step 3) |
| Dashboard empty / errors | Check all 3 env vars on Vercel; redeploy after adding them |
| `auth/callback` error | Ensure redirect URL includes `/auth/callback` |
| Build fails on Vercel | Run `npm run build` locally; fix TypeScript errors first |
| Preview deploy auth fails | Add `https://*-*.vercel.app/**` to Supabase redirect URLs |

## Security

- Service role key is only used in server components (`getDemoDb()`). Acceptable for a portfolio demo; tighten RLS before real multi-tenant production.
- Keep the GitHub repo **private** if you prefer; the Vercel URL can still be public.

## What does not run on Vercel

These stay local or move to GitHub Actions later:

- `scripts/seed_supabase.py`
- `scripts/run_ml_pipeline.py`
- `scripts/run_causal_pipeline.py`

The live site reads data already stored in Supabase.
