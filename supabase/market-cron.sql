-- Optional ArahDana market refresh cron.
-- Run after deploying the market-batch-refresh Edge Function and setting secrets.
-- Replace project ref and anon key before enabling in production.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'arahdana-market-batch-refresh',
  '*/15 * * * *',
  $$
  select
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/market-batch-refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
      ),
      body := '{}'::jsonb
    );
  $$
);
