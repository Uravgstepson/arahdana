# ArahDana Supabase Setup

1. Create a Supabase project.
2. Run `supabase/arahdana-schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Enable Email and Google providers in Supabase Auth.
6. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-VERCEL-APP.vercel.app/auth/callback`
   - `https://arahdana.id/auth/callback`
7. Restart `npm run dev`.

Private app routes require Supabase Auth. The landing and beta signup pages can still render without these env vars, but login, profile, portfolio sync, and user-owned finance data require Supabase to be configured.
