# ArahDana Supabase Setup

1. Create a Supabase project.
2. Run `supabase/arahdana-schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Restart `npm run dev`.

The app stays local-first when these env vars are missing. Login, profile, online portfolio save, and cross-device sync become available after Supabase is configured.
