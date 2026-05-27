# ArahDana

ArahDana is a private finance decision-support web app for portfolio tracking, market analysis, DCA goals, alerts, and review reports.

Current release candidate: `v1.0.0-rc1`

Release notes and QA gate:

- `docs/release/v1.0.0-rc1.md`
- `docs/release/qa-v1.0.0-rc1.md`
- `docs/internal/beta-feedback-summary-v1.0.0-rc1.md`

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use the Supabase project URL and anon/publishable browser key. Do not use a service-role key in this app.

## Supabase Auth

Enable Email and Google providers in Supabase Auth.

Add these redirect URLs in Supabase Auth URL Configuration:

```text
http://localhost:3000/auth/callback
https://YOUR-VERCEL-APP.vercel.app/auth/callback
https://arahdana.id/auth/callback
```

For Vercel preview deployments, add the preview callback URL you use for testing.

## Database

Run `supabase/arahdana-schema.sql` in the Supabase SQL editor.

The schema enables Row Level Security for user-owned finance tables and uses policies based on:

```sql
auth.uid() = user_id
```

## Deployment Checklist

- `npm run build` passes locally.
- `NEXT_PUBLIC_SUPABASE_URL` is set in Vercel.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in Vercel.
- Email login and register work.
- Google login returns to `/auth/callback`.
- Private routes redirect unauthenticated users to `/login`.
- User-owned data tables have RLS enabled.
- Supabase redirect URLs include local, Vercel, and production domains.
