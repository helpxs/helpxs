# helpxs

Privacy-safe coaching ops app for Stanford Well-Being Coaching. Coaches log
post-session data in under 3 minutes; directors get aggregate dashboards and
can evolve the form over time without touching engineering.

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
      routes/          sessions, forms, coaches, aggregates
    migrations/        D1 SQL migrations for app tables
    wrangler.toml      bindings: DB (D1), ASSETS (../web/dist)
```

## Routes

**Public**
- `/login` — sign in / sign up (responsive split-panel)

**Coach (mobile-first, sticky bottom CTA)**
- `/` — home (week stats + recent sessions)
- `/entry/1..5` — 5-step form (Context · Who · Topic · Intervention · Referral)
- `/entry/review` — review + submit
- `/entry/done` — confirmation

**Director (desktop, sticky sidebar)**
- `/director/overview` — KPIs, sessions trend, top topics, format mix, recent activity
- `/director/reports` — generate a report (window + audience + sections, live preview)
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
POST /api/sessions                 submit a session

GET  /api/forms/current            current published form (seeded on first read)
GET  /api/forms/versions           full version history
POST /api/forms/version            publish a new version (PII-field guardrail)

GET  /api/coaches                  org members + pending invitations
POST /api/coaches/invite           invite by Stanford email

GET  /api/aggregates/overview      KPIs + chart data for director dashboard
GET  /api/aggregates/report?window=week|month|quarter
```

Sessions are stored against the active form version; old entries stay tied to
the version they were submitted under, so reporting stays consistent across
form changes.

## Local dev

```bash
npm install

# 1. Apply local D1 migrations (creates a SQLite shim in apps/api/.wrangler/)
cd apps/api
npx wrangler d1 migrations apply helpxs --local
cd ../..

# 2. Set local secrets
cat <<EOF > apps/api/.dev.vars
BETTER_AUTH_SECRET=<32-byte-hex>
BETTER_AUTH_URL=http://localhost:8787
MIGRATE_TOKEN=<random-token>
OPENROUTER_API_KEY=<openrouter-api-key>
OPENROUTER_MODEL=google/gemini-3-flash-preview
EOF

# 3. Start Worker (api + assets fallback) on :8787
npm run dev:api

# 4. Start Vite (proxies /api -> :8787) on :5173 in another terminal
npm run dev:web

# 5. One-shot: create better-auth's tables in your local D1
curl -X POST http://localhost:8787/api/_internal/migrate-auth \
  -H "x-migrate-token: <your-migrate-token>"
```

Then open http://localhost:5173, sign up with a Stanford-style email, and the
backend will auto-create an organization and seed the default form (v1).

## Deploy to Cloudflare

```bash
# Once: create the D1 database and copy the database_id into apps/api/wrangler.toml
cd apps/api
npx wrangler d1 create helpxs
# (paste the printed database_id into wrangler.toml's [[d1_databases]] block)

# Apply migrations to remote D1
npx wrangler d1 migrations apply helpxs --remote

# Set production secrets
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put MIGRATE_TOKEN
npx wrangler secret put OPENROUTER_API_KEY
# Update BETTER_AUTH_URL and OPENROUTER_MODEL in [vars] as needed

cd ../..

# Build SPA + deploy Worker (which uploads apps/web/dist as static assets)
npm run deploy

# One-shot: create better-auth's tables in remote D1
curl -X POST https://<your-worker>.workers.dev/api/_internal/migrate-auth \
  -H "x-migrate-token: <your-migrate-token>"

# Then go remove the /api/_internal/migrate-auth route, or gate it behind a
# secret/admin check.
```

The Worker code only handles `/api/*`. Any other request falls through to the
ASSETS binding, which serves the Vite build with SPA fallback to `index.html`,
so React Router routes resolve correctly on direct loads / refreshes.

## Privacy guardrails

The product is structurally constrained from collecting student PII:
- The form schema rejects new field labels matching `name|email|phone|student-id|ssn`
  (see `apps/api/src/routes/forms.ts`)
- Core fields are non-deletable, so historical reporting stays comparable
- No session-data field stores free text by default; custom questions are
  limited to single-select / multi-select / yes-no / rating / number / short-text

## Adding shadcn components

```bash
cd apps/web
npx shadcn@latest add card input label form
```

The Warm Soft palette (cream `#F5F1E8`, cardinal `#8C1515`, DM Sans) is mapped
into shadcn's design tokens in `src/index.css`, so every shadcn component
inherits the theme automatically.
