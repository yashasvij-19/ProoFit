# ProoFit

Replace "DM me your proof of work" with a proper submission platform — and let AI do the first pass of shortlisting, against criteria you define, not a fixed rubric.

## Why this exists

Candidates are asked to DM proof of work directly — which works, but doesn't scale past a handful of applicants, and leaves no structured way to compare submissions against what actually matters for this role. This is a small fix: a public submission form instead of a DM inbox, and an admin dashboard where you define your own criteria (not preset ones) and let AI score and rank submissions against exactly what you're looking for.


## What it does

- **Public form** — candidates submit name, contact info, a live project URL, and a GitHub URL. No account needed.
- **Admin dashboard** (password-protected) — define your own scoring criteria in plain language, set how many to shortlist and how many honorable mentions, and trigger AI analysis.
- **Analysis pipeline** — pulls real signal from each GitHub repo (commit history, message quality, structure, README consistency), scores it against every criterion you've defined, and generates an honest, plain-language summary per candidate — not just a number.
- **Candidate detail view** — full breakdown per criterion, with reasoning, not just a score.

## What's intentionally left out of this MVP

- No resume-to-project cross-checking (flagged, not built — clear next step)
- No public-facing status page for candidates to check where they stand
- No duplicate-submission detection
- Admin auth is a single shared password, not full user accounts — appropriate for one admin, not a team

## Setup

1. Copy `.env.example` to `.env.local` and fill in:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ADMIN_PASSWORD=
GITHUB_TOKEN=   # optional, recommended to avoid GitHub rate limits
\`\`\`

2. Install and run:

\`\`\`
npm install
npm run dev
\`\`\`

- Public form: http://localhost:3000
- Admin: http://localhost:3000/admin

The database tables (`submissions`, `criteria`, `settings`, `criterion_scores`, `rankings`) are expected to already exist in Supabase. This app does not create or migrate them.