# Post-deploy checklist (before Phase 5)

Use this after Vercel is live and working in your normal browser. Goal: confirm the **public demo** is solid before building experiments.

## Production smoke test (incognito)

Open your **production** URL (not a preview link) in a private/incognito window:

- [ ] No **Vercel login** gate (see [Deployment Protection](DEPLOYMENT.md#7-vercel-deployment-protection-public-demo))
- [ ] `/` — landing page loads
- [ ] `/demo/dashboard` — public demo loads **without** login (recruiter path); login page is **email** Supabase (not username + Acme/Globex — see [DEPLOYMENT.md §6](DEPLOYMENT.md#6-verify-you-deployed-this-repo))
- [ ] `/signup` — create a new test account
- [ ] `/dashboard` — metrics show ~500 customers, chart, anomalies
- [ ] `/customers` — table with risk badges
- [ ] `/playbooks` — 12 rows (4 treatments × 3 segments)
- [ ] Open a customer → survival + usage charts + playbook recommendations
- [ ] Sign out → `/dashboard` redirects to `/login`

## Local / API sanity (optional)

```bash
source venv/bin/activate
python scripts/check_supabase.py   # URL + service role
npm run build
npm run lint
```

Anon key test:

```bash
set -a && source .env.local && set +a
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/customers?select=id&limit=1"
# Expect: 200
```

## README / portfolio (recommended)

- [ ] Add your **live demo URL** to `README.md` (top or Deploy section)
- [ ] Share **`/demo/dashboard`** for visitors who should not sign up
- [ ] Add 1–2 screenshots (dashboard, customer detail) for GitHub/Vercel
- [ ] Note: “Sign up to explore demo data” (email confirmation off in Supabase for easy access)

## Supabase (one-time)

- [ ] Auth → URL configuration: production Vercel URL + `http://localhost:3000/**`
- [ ] Auth → Email: provider on; confirm email **off** for portfolio demos (optional)
- [ ] Vercel env vars: all 3 keys on **Production**; redeploy after changes

## Data / ML (only if you change data)

Re-run locally when regenerating synthetic data:

```bash
python scripts/run_ml_pipeline.py --replace
python scripts/run_causal_pipeline.py --replace
```

`DATABASE_URL` in `.env.local` is only for these scripts—not required on Vercel.

## Not required before Phase 5

| Item | When |
|------|------|
| Phase 5 experiments UI + data | Next feature work |
| Middleware → proxy migration (Next 16 warning) | Cosmetic; later |
| Replace service-role reads with strict RLS | Before real multi-tenant product |
| GitHub Actions for scheduled ML | After Phase 5+ |
| Custom domain on Vercel | Portfolio polish |
| Stripe / billing | Phase 6 |

## Ready for Phase 5 when

- [x] Live URL works for strangers (incognito, other device)
- [x] Auth + dashboard + customers + playbooks verified
- [ ] README lists live demo URL (you add your Vercel link)
