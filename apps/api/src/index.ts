import { Hono } from "hono"
import { cors } from "hono/cors"
import { getMigrations } from "better-auth/db/migration"
import { createAuth } from "./auth"
import type { App } from "./middleware"
import { requireAuth } from "./middleware"
import { sessions } from "./routes/sessions"
import { forms } from "./routes/forms"
import { coaches } from "./routes/coaches"
import { aggregates } from "./routes/aggregates"
import { invitations } from "./routes/invitations"
import { passwordResets } from "./routes/password-resets"
import { calendar } from "./routes/calendar"
import { recall } from "./routes/recall"

const app = new Hono<App>()

// Permissive same-origin CORS (frontend is served by the same Worker via the
// ASSETS binding; this header is here for local Vite dev where the frontend
// proxies through to :8787).
app.use(
  "/api/*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
)

app.get("/api/health", (c) => c.json({ status: "ok" }))

// Current user + active-org role. Frontend uses this to dispatch the index
// route (director → /director/overview, coach → /).
app.get("/api/me", requireAuth, (c) => {
  const user = c.get("user")
  return c.json({
    user,
    organizationId: c.get("organizationId"),
    role: c.get("role"),
  })
})

// Dev-only: apply better-auth's schema to D1. Disabled (returns 404) unless
// MIGRATE_TOKEN is set; when set, must be supplied via the
// `x-migrate-token` header. Run once per database (local or remote) after
// applying app migrations.
app.post("/api/_internal/migrate-auth", async (c) => {
  const expected = c.env.MIGRATE_TOKEN
  if (!expected) return c.notFound()
  if (c.req.header("x-migrate-token") !== expected) {
    return c.json({ error: "Forbidden" }, 403)
  }
  const auth = createAuth(c.env)
  const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(
    auth.options,
  )
  if (toBeCreated.length === 0 && toBeAdded.length === 0) {
    return c.json({ message: "no migrations needed" })
  }
  await runMigrations()
  return c.json({
    message: "migrations applied",
    created: toBeCreated.map((t) => t.table),
    added: toBeAdded.map((t) => t.table),
  })
})

// Better-auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw))

// Domain routes
app.route("/api/sessions", sessions)
app.route("/api/forms", forms)
app.route("/api/coaches", coaches)
app.route("/api/aggregates", aggregates)
app.route("/api/invitations", invitations)
app.route("/api/password-resets", passwordResets)
app.route("/api/calendar", calendar)
app.route("/api/recall", recall)

// Anything else (non-/api) falls through to the Static Assets binding, which
// is configured (in wrangler.toml) with not_found_handling = "single-page-application"
// so React Router routes resolve to index.html.
app.all("*", async (c) => {
  if (!c.env.ASSETS) {
    return c.notFound()
  }
  return c.env.ASSETS.fetch(c.req.raw)
})

export default app
