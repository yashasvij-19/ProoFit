# ProoFit

A Next.js 14 (App Router) submission platform plus an AI shortlisting dashboard for hirers.

## Setup

1. Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ADMIN_PASSWORD=
GITHUB_TOKEN=   # optional, recommended to avoid GitHub rate limits
```

2. Install and run:

```
npm install
npm run dev
```

- Public form: http://localhost:3000
- Admin: http://localhost:3000/admin

The database tables (`submissions`, `criteria`, `settings`, `criterion_scores`, `rankings`) are expected to already exist in Supabase. This app does not create or migrate them.
