# WC26 Group Bet

A lightweight World Cup 2026 group-stage betting site for a friendly group pool.

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase values.
2. Apply `supabase/migrations/001_initial_schema.sql` in your Supabase project.
3. Ensure Supabase Auth email confirmations are disabled for this no-email friendly flow.
4. Set `ADMIN_NICKNAMES` to your signup name.
5. Sync fixtures:

```bash
npm run sync:fixtures
```

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

No API key, payment, or bot-sensitive scraping is required. Admins can manually correct final scores if upstream data lags.

## Game Rules

Default rules are configurable in the admin page:

- Exact match score: 3 points
- Correct match outcome: 1 point
- Exact group position: 3 points
- Top-two qualifier in wrong order: 1 point
