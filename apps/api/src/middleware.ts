import type { Context, MiddlewareHandler } from "hono"
import { createAuth } from "./auth"

export type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  // Optional: set to enable the dev-only auth-schema migration endpoint.
  // Leave unset in production so the endpoint 404s.
  MIGRATE_TOKEN?: string
  // Optional: enables LLM-powered report narrative + dashboard insights.
  // Without these, the corresponding routes fall back to deterministic text.
  OPENROUTER_API_KEY?: string
  OPENROUTER_MODEL?: string
  // Optional: Calendly OAuth. When unset, coaches connect a mock calendar so
  // the flow still works end-to-end (course-prototype mode).
  CALENDLY_CLIENT_ID?: string
  CALENDLY_CLIENT_SECRET?: string
  CALENDLY_REDIRECT_URI?: string
}

export type Role = "director" | "coach"

export type Variables = {
  user: { id: string; email: string; name: string }
  organizationId: string
  role: Role
  auth: ReturnType<typeof createAuth>
}

export type App = { Bindings: Bindings; Variables: Variables }

/**
 * Resolves the current better-auth session from the request, attaches the user
 * (and active org) to the context, or 401s.
 */
export const requireAuth: MiddlewareHandler<App> = async (c, next) => {
  const auth = createAuth(c.env)
  c.set("auth", auth)

  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401)
  }
  c.set("user", {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email,
  })

  // Active organization — fall back to first membership, or create a personal
  // one on demand so single-tenant deployments don't 500.
  let orgId = (session.session as { activeOrganizationId?: string })
    ?.activeOrganizationId

  if (!orgId) {
    const orgs = await auth.api
      .listOrganizations({ headers: c.req.raw.headers })
      .catch(() => [])
    if (orgs && orgs.length > 0) {
      orgId = orgs[0].id
    } else {
      const created = await auth.api.createOrganization({
        body: {
          name: `${session.user.name ?? "Personal"}'s org`,
          slug: `org-${session.user.id.slice(0, 8)}`,
        },
        headers: c.req.raw.headers,
      })
      orgId = (created as { id: string } | null)?.id ?? undefined
    }
  }
  if (!orgId) {
    return c.json({ error: "No organization for user" }, 400)
  }
  c.set("organizationId", orgId)

  // Resolve role within active org. owner/admin → director; member → coach.
  // Falls back to coach if the lookup fails for any reason.
  let role: Role = "coach"
  try {
    const members = await auth.api.listMembers({
      query: { organizationId: orgId },
      headers: c.req.raw.headers,
    })
    const me = (members as { members?: Array<{ user: { id: string }; role: string }> })
      ?.members?.find((m) => m.user.id === session.user.id)
    if (me && (me.role === "owner" || me.role === "admin")) role = "director"
  } catch {
    // ignore
  }
  c.set("role", role)

  return next()
}

export function jsonError(c: Context, status: number, error: string) {
  return c.json({ error }, status as 400 | 401 | 403 | 404 | 500)
}

/**
 * Authorization gate. Run AFTER `requireAuth` so role is on context.
 *
 *   app.use("/director-only", requireAuth, requireRole("director"))
 */
export const requireRole =
  (...allowed: Role[]): MiddlewareHandler<App> =>
  async (c, next) => {
    const role = c.get("role")
    if (!role || !allowed.includes(role)) {
      return c.json(
        { error: `Forbidden — requires role ${allowed.join(" or ")}` },
        403,
      )
    }
    return next()
  }
