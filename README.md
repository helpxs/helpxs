# helpxs

Calendar-integrated coaching ops app for Stanford Well-Being Coaching. Coaches
connect their calendar, see a **pre-session recall** of a returning student's
prior history (background, themes, prior strategies), then complete a
**post-session form pre-filled from the calendar event** in under 5 minutes.
Directors get a minimal dashboard (session volume / topics / referrals) and a
token-only CSV export, and can evolve the form's dropdowns without engineering.

Student identity is kept out of reporting via a **pseudonymous token
architecture**: session records store only a stable token; the token→identity
crosswalk lives in a separate access-controlled table read only by recall and
form-prefill (`apps/api/src/crosswalk.ts`).

Built as a single Cloudflare Worker that serves both the API and the SPA.

## Stack

- **Frontend** — Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui +
  React Router + TanStack Query + zustand
- **Backend** — Hono on Cloudflare Workers
- **Database** — Cloudflare D1
- **Auth** — better-auth with the `organization` plugin
- **Deploy** — single Worker with the [Static Assets binding][assets] serving
  the built SPA, with `not_found_handling = "single-page-application"` for
  client routing

[assets]: https://developers.cloudflare.com/workers/static-assets/

## Layout

```
apps/
  web/                 Vite + React + TS + Tailwind + shadcn
    src/
      layouts/         AppShell (auth gate), DirectorLayout, CoachLayout, EntryStepShell
      screens/         login, coach-home, coach-entry (5 steps + review), coach-confirm,
                       director-dashboard / -reports / -form / -coaches
      components/
        ui/            shadcn primitives (button, dialog, sheet, switch, ...)
        app/           HelpXs-specific bits (logo, chip, profile-sheet, *-dialog)
      lib/             api client, auth client, types
      store/           zustand entry-draft store (persisted)
  api/                 Hono on Cloudflare Workers
    src/
      index.ts         routes + assets fallback
      auth.ts          better-auth config (D1 + organization plugin)
      middleware.ts    requireAuth + active-org resolution
      crosswalk.ts     pseudonymous token ⇄ identity (sole access point)
      calendly.ts      Calendly OAuth + scheduled-events fetch + mock source
      routes/          sessions, forms, coaches, aggregates, calendar, recall
    migrations/        D1 SQL migrations for app tables
    wrangler.toml      bindings: DB (D1), ASSETS (../web/dist)
```

## Routes

**Public**
- `/login` — sign in / sign up (responsive split-panel)

**Coach (mobile-first, sticky bottom CTA)**
- `/coach` — home: connect calendar, then today's sessions (returning / first-session badges) + your recent entries
- `/coach/recall/:eventId` — pre-session recall (background · themes · prior strategies)
- `/coach/session/:eventId` — post-session form, pre-filled from the calendar event
- `/coach/history` — your past entries
- `/entry/done` — confirmation
- `/sessions/:id` — session detail

**Director (desktop, sticky sidebar)**
- `/director/overview` — minimal dashboard: session volume, top topics, referral patterns + CSV download
- `/director/sessions` — browse all session records (token-linked)
- `/director/form` — current form fields + version history dialog + edit-field dialog
- `/director/form/new` — opens the Add Question dialog over the form page
- `/director/coaches` — invite by Stanford email + member table

## API

All routes are auth-gated by better-auth session cookie except `/api/health`,
`/api/auth/*`, and `/api/_internal/migrate-auth`.

```
GET  /api/health
POST /api/_internal/migrate-auth   (one-shot — protect or remove in prod)
*    /api/auth/*                   better-auth handler

GET  /api/sessions/me              coach's recent sessions
POST /api/sessions                 submit a session (stores student_token only)

GET  /api/forms/current            current published form (seeded on first read)
GET  /api/forms/versions           full version history
POST /api/forms/version            publish a new version (PII-field + core guardrails)

GET  /api/coaches                  org members + pending invitations
POST /api/coaches/invite           invite by Stanford email

# Calendar (Calendly OAuth, with mock fallback)
GET  /api/calendar/status          connected? provider? calendly configured?
GET  /api/calendar/authorize       → { url } Calendly authorize link (if configured)
GET  /api/calendar/callback        OAuth redirect target; exchanges code, syncs events
POST /api/calendar/connect/mock    connect a demo calendar (seeds a day + recall history)
POST /api/calendar/sync            re-fetch scheduled events
GET  /api/calendar/today           today's sessions (name via crosswalk, returning badge)
GET  /api/calendar/event/:id       single event for post-session form prefill

GET  /api/recall/:token            pre-session recall (background · themes · strategies)

GET  /api/aggregates/overview      minimal dashboard (volume / topics / referrals)
GET  /api/aggregates/export.csv    token-only CSV of all session records
```

Sessions are stored against the active form version; old entries stay tied to
the version they were submitted under, so reporting stays consistent across
form changes. Calendar and recall routes are auth-gated but role-open (coaches
use them); aggregates + CSV are director-only.

## Local dev

```bash
npm install

# 1. Apply local D1 migrations (creates a SQLite shim in apps/api/.wrangler/)
cd apps/api
npx wrangler d1 migrations apply helpxs --local
cd ../..

# 2. Set local secrets
cat <<EOF > apps/api/.dev.vars
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=http://localhost:8787
EOF

# 3. Start Worker (api + assets fallback) on :8787
npm run dev:api

# 4. Start Vite (proxies /api -> :8787) on :5173 in another terminal
npm run dev:web

# 5. One-shot: create better-auth's tables in your local D1
curl -X POST http://localhost:8787/api/_internal/migrate-auth
```

Then open http://localhost:5173, sign up with a Stanford-style email, and the
backend will auto-create an organization and seed the default form (v1). On the
coach home, click **Use demo calendar** to seed a day of appointments (with one
returning student who has prior history, so pre-session recall has content).
Set `CALENDLY_CLIENT_ID` / `CALENDLY_CLIENT_SECRET` in `.dev.vars` to enable the
real Calendly OAuth flow instead.

To reset local data after schema changes: `rm -rf apps/api/.wrangler/state` then
re-apply migrations and re-run `migrate-auth`.

## Deploy to Cloudflare

```bash
# Once: create the D1 database and copy the database_id into apps/api/wrangler.toml
cd apps/api
npx wrangler d1 create helpxs
# (paste the printed database_id into wrangler.toml's [[d1_databases]] block)

# Apply migrations to remote D1
npx wrangler d1 migrations apply helpxs --remote

# Set production secret
npx wrangler secret put BETTER_AUTH_SECRET   # generate with: openssl rand -hex 32
# Update BETTER_AUTH_URL in [vars] to your worker's public URL

cd ../..

# Build SPA + deploy Worker (which uploads apps/web/dist as static assets)
npm run deploy

# One-shot: create better-auth's tables in remote D1
curl -X POST https://<your-worker>.workers.dev/api/_internal/migrate-auth

# Then go remove the /api/_internal/migrate-auth route, or gate it behind a
# secret/admin check.
```

The Worker code only handles `/api/*`. Any other request falls through to the
ASSETS binding, which serves the Vite build with SPA fallback to `index.html`,
so React Router routes resolve correctly on direct loads / refreshes.

## Privacy guardrails

Student identity is structurally walled off from reporting:
- Session records store only a **pseudonymous `student_token`** (a SHA-256
  derivation of stable booking identity). The token→name/university-id
  **crosswalk** lives in its own table and is reachable only via
  `apps/api/src/crosswalk.ts`, called from exactly two places: pre-session
  recall and post-session form prefill.
- The director dashboard, the session browser, and the CSV export operate
  exclusively on tokens — they never join the crosswalk, so no name/email/ID
  ever appears in a director-facing view or export.
- The form schema rejects new field labels matching
  `name|email|phone|student-id|ssn|university-id` (see `routes/forms.ts`).
- Core fields are non-deletable, so historical reporting stays comparable.
- Custom questions are limited to single-select / multi-select / yes-no /
  rating / number / short-text. (The two core open-text fields — "what did you
  talk about / do?" — are coach-authored session content, not identifiers.)

## Adding shadcn components

```bash
cd apps/web
npx shadcn@latest add card input label form
```

The Warm Soft palette (cream `#F5F1E8`, cardinal `#8C1515`, DM Sans) is mapped
into shadcn's design tokens in `src/index.css`, so every shadcn component
inherits the theme automatically.
