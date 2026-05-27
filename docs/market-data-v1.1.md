# ArahDana v1.1 Market Data Architecture

Market data must never be fetched directly from client components with provider API keys.

## Edge Functions

Supabase Edge Functions:

- `market-search`
- `market-quote`
- `market-batch-refresh`
- `market-insight`

Deploy with Supabase CLI after setting secrets:

```bash
supabase secrets set MARKET_PROVIDER=twelve_data
supabase secrets set TWELVE_DATA_API_KEY=...
supabase functions deploy market-search
supabase functions deploy market-quote
supabase functions deploy market-batch-refresh
supabase functions deploy market-insight
```

Supported secret names:

- `MARKET_PROVIDER`
- `ALPHA_VANTAGE_API_KEY`
- `TWELVE_DATA_API_KEY`
- `FINNHUB_API_KEY`
- `IDX_PROVIDER_API_KEY`

Use only providers that are available. If a provider fails or hits a limit, the app should keep cached quotes and show last-updated/delayed labels.

## Database

Tables added in `supabase/arahdana-schema.sql`:

- `market_assets`
- `market_quotes`
- `market_watchlist`
- `market_price_history`

RLS rules:

- `market_assets`, `market_quotes`, and `market_price_history` are public read.
- `market_watchlist` is user-owned.
- API keys stay server-side in Edge Function secrets.

## Refresh Strategy

Use Supabase Cron or another trusted backend scheduler to invoke `market-batch-refresh`.

Recommended cadence:

- Popular assets: every 5-15 minutes if provider quota allows.
- User watchlist and portfolio tickers: every 5-15 minutes if provider quota allows.
- Slow or delayed sources: hourly or daily.

UI copy:

- `Diperbarui 3 menit lalu`
- `Data tertunda`
- `Harga belum tersedia`

## Product Rules

- Do not call provider APIs from React client code.
- Do not fake realtime data.
- Do not scrape unauthorized finance sites.
- Do not overwrite buy price.
- Auto price tracking may update current price only when the user chooses Auto mode.
- Market insight must stay informational and include: `Insight ini bersifat informatif, bukan rekomendasi investasi.`
