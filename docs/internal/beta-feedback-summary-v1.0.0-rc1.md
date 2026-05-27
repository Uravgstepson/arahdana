# ArahDana v1.0.0 RC1 Beta Feedback Summary

Date: 2026-05-27
Audience: internal release review

## What Testers Liked

- Clear separation between Home, Porto, Market, Goals, Analysis, and Menu.
- Portfolio tracking feels practical when add, edit, delete, and CSV import work without reloads.
- Privacy mode is useful for screen sharing and mobile use.
- The calmer finance wording makes the app feel less like a trading signal tool.
- Feedback entry point in Menu makes beta reporting easy.

## What Confused Testers

- Stale portfolio data made it unclear whether Home or Porto was the real source of truth.
- Deleted holdings sometimes appeared again from old local/demo state.
- Some users expected Analysis to be financial advice instead of decision support.
- CSV import expectations need clearer supported-format guidance.
- Account/data deletion needs strong confirmation and simple wording.

## Bugs Found

- Home portfolio card could stay stale after adding or editing a holding.
- Porto could render old cached/demo holdings while edit/detail routes used real authenticated data.
- Deleted holdings could reappear after navigating back.
- Feedback storage needed a Supabase-backed table and page context.
- Legal/trust links were missing from auth and Menu surfaces.

## Bugs Fixed

- Home and Porto now share refreshed portfolio data from the authenticated source.
- Portfolio add, edit, delete, CSV import, and reset flows invalidate/refetch current holdings.
- Authenticated portfolio pages no longer intentionally repopulate from stale demo data.
- Deleted or missing holdings show a clean "Produk tidak ditemukan" state.
- Feedback is stored in Supabase with user, message, page, and timestamp.
- Disclaimer, privacy, terms, and account/data deletion have been added.
- Version/about information is visible for the release candidate.

## Wait Until v1.1

- Broker, bank, or e-wallet integrations.
- More CSV templates and guided import mapping.
- More advanced risk models and asset classes.
- Notification scheduling refinements.
- Full release dashboard for monitoring beta cohorts.
- Larger UI redesign or navigation experiments.
