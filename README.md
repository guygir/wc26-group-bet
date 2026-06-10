# WC26 Group Bet

A lightweight World Cup 2026 group-stage betting site for a friendly group pool.

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase values.
2. Apply migrations in order in Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_scoring_rules_v2.sql`
   - `supabase/migrations/003_group_official_standings.sql`
3. Ensure Supabase Auth email confirmations are disabled for this no-email friendly flow.
4. Set `ADMIN_NICKNAMES` to your signup name.
5. Sync fixtures:

```bash
npm run sync:fixtures
```

Uses `.env.local` (same keys as `npm run dev`). If you see missing env errors, confirm `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set there.

## Development

```bash
npm run dev
npm run lint
npm run test
npm run build
```

## Data Source

Fixtures and any available scores are fetched from OpenFootball public JSON:

`https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`

No API key, payment, or bot-sensitive scraping is required. Only **group-stage** matches (72) are stored. Admins can manually correct or reset final scores.

Scores are **not live in the browser**. After deploy, GitHub Actions calls `/api/cron/sync-scores` every 30 minutes (protected by `CRON_SECRET`) to sync OpenFootball and recompute points. Admins can also sync manually.

For scheduled syncs, add a GitHub repository secret named `CRON_SECRET` with the same value used in Vercel. The workflow defaults to `https://wc26-group-bet.vercel.app/api/cron/sync-scores`; set a repository variable named `SYNC_URL` to override it.

## Game Rules (defaults, configurable in Admin)

**Match bets (stack, max 6):**

- Exact home goals: 1
- Exact away goals: 1
- Exact goal difference: 1
- Correct result (win/draw): 3

**Group standings:**

- 1 point per team in the correct position
- +1 bonus when all four positions are correct (5 max per group)
