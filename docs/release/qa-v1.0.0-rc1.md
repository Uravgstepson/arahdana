# ArahDana v1.0.0 RC1 QA Checklist

Date prepared: 2026-05-27
Status: automated checks passed; final live regression pending

## Automated Checks

- [x] `npm run lint` passed locally on 2026-05-27.
- [x] `npm run build` passed locally on 2026-05-27.
- [ ] Production smoke test on Vercel preview

## Core Regression

- [ ] Login with Google.
- [ ] Login with email/password.
- [ ] Logout clears authenticated session.
- [ ] Add portfolio holding.
- [ ] Holding appears on Home and Porto without refresh.
- [ ] Edit portfolio holding.
- [ ] Delete portfolio holding.
- [ ] Deleted holding does not return after refresh.
- [ ] Reset portfolio data returns Home, Porto, and Analysis to empty state.
- [ ] Old edit URL for deleted holding shows "Produk tidak ditemukan".
- [ ] Privacy mode hides sensitive values.
- [ ] App lock can be enabled and unlocks correctly.
- [ ] Market search returns usable results or a clear empty/error state.
- [ ] Goals can be created, viewed, and updated.
- [ ] Analysis can be created and viewed.
- [ ] CSV import adds holdings without duplicating stale data.
- [ ] Feedback form sends a message and shows a friendly success state.

## Mobile And PWA

- [ ] Home, Porto, Market, Goals, Analysis, Settings, and Menu fit on mobile.
- [ ] Capsule navigation stays usable on small screens.
- [ ] Drawer menu opens and closes cleanly.
- [x] PWA manifest is present at `public/manifest.json` and linked from app metadata.
- [x] Service worker registration component and `public/sw.js` are present.
- [ ] Service worker registers in production.
- [ ] App can be installed from a supported mobile browser.

## Supabase And Data Isolation

- [ ] Production schema has been updated from `supabase/arahdana-schema.sql`.
- [ ] RLS is enabled on user-owned tables.
- [ ] User A cannot read User B portfolio, watchlist, goals, alerts, settings, feedback, reports, or analysis rows.
- [ ] User A cannot update or delete User B rows.
- [ ] Feedback rows are scoped to the current user.
- [ ] Account deletion removes user-owned portfolio, watchlist, goals, alerts, settings, feedback, reports, analysis rows, profile, and auth user.
- [ ] No demo/test holdings appear after login.
- [ ] No sensitive financial values are sent to analytics or error logs.

## Performance Pass

- [ ] Mobile first load is acceptable on a Vercel preview using throttled mobile data.
- [ ] No obvious repeated refetch loop on Home, Porto, Market, Goals, or Analysis.
- [ ] Heavy charts and market data states show loading/empty/error states clearly.
- [x] Removed unused large public background PNG assets; active logo/icon assets remain local.
- [ ] Vercel Speed Insights receives data in production.

## Release Decision

Decision before final promotion:

- [ ] Ready for v1.0
- [ ] Needs minor fixes
- [ ] Blocked

Notes:

- Local automated checks can be completed in this repo.
- Login, PWA install, RLS isolation, and account deletion require a live Supabase/Vercel environment and at least two test users.
