import { Hono } from "hono"
import type { App } from "../middleware"
import { requireAuth, requireRole } from "../middleware"
import { TOKEN_TTL_HOURS } from "./password-resets"

function buildBase(c: { req: { url: string }; env: { BETTER_AUTH_URL: string } }) {
  return new URL(c.req.url).origin.replace(/\/$/, "") || c.env.BETTER_AUTH_URL
}

export const coaches = new Hono<App>()

coaches.use("*", requireAuth, requireRole("director"))

/**
 * Lists members of the active organization. Joins with sessions_log so the
 * director sees per-coach activity counts. Treats invitations as "invited"
 * status entries so the table can show pending invites alongside active
 * coaches in the same place.
 */
coaches.get("/", async (c) => {
  const orgId = c.get("organizationId")
  const auth = c.get("auth")

  // Active members
  const members = await auth.api.listMembers({
    query: { organizationId: orgId },
    headers: c.req.raw.headers,
  }).catch(() => ({ members: [] as Array<{ user: { id: string; name: string; email: string } }> }))

  const memberRows = (members?.members ?? []) as Array<{
    user: { id: string; name: string; email: string }
  }>

  // Coach activity (sessions count + last entry)
  const counts = await c.env.DB.prepare(
    `SELECT coach_id, COUNT(*) AS sessions, MAX(occurred_at) AS last_at
     FROM sessions_log WHERE organization_id = ? GROUP BY coach_id`,
  )
    .bind(orgId)
    .all<{ coach_id: string; sessions: number; last_at: string }>()
  const byCoach = new Map(counts.results.map((r) => [r.coach_id, r]))

  const active = memberRows.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    sessions: byCoach.get(m.user.id)?.sessions ?? 0,
    lastEntryAt: byCoach.get(m.user.id)?.last_at ?? null,
    status: "active" as const,
  }))

  // Pending invitations
  const invitations = await auth.api
    .listInvitations({
      query: { organizationId: orgId },
      headers: c.req.raw.headers,
    })
    .catch(() => [] as Array<{ id: string; email: string; status?: string }>)

  const pending = (invitations as Array<{ id: string; email: string; status?: string }>)
    .filter((i) => (i.status ?? "pending") === "pending")
    .map((i) => ({
      id: i.id,
      name: i.email.split("@")[0],
      email: i.email,
      sessions: 0,
      lastEntryAt: null,
      status: "invited" as const,
    }))

  return c.json({ coaches: [...active, ...pending] })
})

coaches.post("/invite", async (c) => {
  const auth = c.get("auth")
  const orgId = c.get("organizationId")
  const body = (await c.req.json()) as {
    email: string
    role: "coach" | "director"
  }

  if (!/^[^@\s]+@stanford\.edu$/i.test(body.email)) {
    return c.json({ error: "Stanford emails only." }, 400)
  }

  const inv = (await auth.api.createInvitation({
    body: {
      email: body.email,
      organizationId: orgId,
      role: body.role === "director" ? "admin" : "member",
    },
    headers: c.req.raw.headers,
  })) as unknown as { id: string; expiresAt?: string | Date }

  // Build the accept URL the coach will open. The director shares this
  // manually (Slack, text, in-person); HelpXs deliberately does not depend on
  // an email service.
  const acceptUrl = `${buildBase(c)}/accept-invite/${inv.id}`

  return c.json({
    coach: {
      id: inv.id,
      name: body.email.split("@")[0],
      email: body.email,
      sessions: 0,
      lastEntryAt: null,
      status: "invited" as const,
    },
    invitation: {
      id: inv.id,
      acceptUrl,
      expiresAt:
        inv.expiresAt instanceof Date
          ? inv.expiresAt.toISOString()
          : (inv.expiresAt ?? null),
    },
  })
})

/**
 * Re-fetch the share link for an existing pending invitation. Director uses
 * this when they closed the dialog and want the link back.
 */
coaches.get("/invitations/:id", async (c) => {
  const orgId = c.get("organizationId")
  const id = c.req.param("id")
  const row = await c.env.DB.prepare(
    `SELECT id, email, organizationId, status, expiresAt FROM invitation WHERE id = ?`,
  )
    .bind(id)
    .first<{
      id: string
      email: string
      organizationId: string
      status: string
      expiresAt: string
    }>()
  if (!row || row.organizationId !== orgId)
    return c.json({ error: "Not found" }, 404)
  if (row.status !== "pending")
    return c.json({ error: `Invitation already ${row.status}` }, 410)

  return c.json({
    invitation: {
      id: row.id,
      email: row.email,
      acceptUrl: `${buildBase(c)}/accept-invite/${row.id}`,
      expiresAt: row.expiresAt,
    },
  })
})

/**
 * Cancel a pending invitation.
 */
coaches.delete("/invitations/:id", async (c) => {
  const orgId = c.get("organizationId")
  const id = c.req.param("id")
  const row = await c.env.DB.prepare(
    `SELECT organizationId, status FROM invitation WHERE id = ?`,
  )
    .bind(id)
    .first<{ organizationId: string; status: string }>()
  if (!row || row.organizationId !== orgId)
    return c.json({ error: "Not found" }, 404)
  await c.env.DB.prepare(
    `UPDATE invitation SET status = 'cancelled' WHERE id = ?`,
  )
    .bind(id)
    .run()
  return c.json({ ok: true })
})

/**
 * Issue a one-time reset link for a coach. Director shares the returned URL
 * manually (no email). The link is valid for 48 hours and single-use.
 */
coaches.post("/:userId/reset-password", async (c) => {
  const orgId = c.get("organizationId")
  const directorId = c.get("user").id
  const targetId = c.req.param("userId")

  // Confirm target is a member of the active org.
  const member = await c.env.DB.prepare(
    `SELECT id FROM member WHERE userId = ? AND organizationId = ?`,
  )
    .bind(targetId, orgId)
    .first()
  if (!member) return c.json({ error: "Coach not in this organization" }, 404)

  const id = crypto.randomUUID()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_HOURS * 3600 * 1000)

  await c.env.DB.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, organization_id, created_by, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      targetId,
      orgId,
      directorId,
      expiresAt.toISOString(),
      now.toISOString(),
    )
    .run()

  return c.json({
    reset: {
      id,
      resetUrl: `${buildBase(c)}/reset-password/${id}`,
      expiresAt: expiresAt.toISOString(),
    },
  })
})

/**
 * Coach detail — used by the Manage sheet. Includes member metadata, session
 * stats, and the most recent N sessions for that coach in the active org.
 */
coaches.get("/:userId", async (c) => {
  const orgId = c.get("organizationId")
  const targetId = c.req.param("userId")

  const member = await c.env.DB.prepare(
    `SELECT m.role, m.createdAt as joinedAt, u.name, u.email
     FROM member m JOIN user u ON u.id = m.userId
     WHERE m.userId = ? AND m.organizationId = ?`,
  )
    .bind(targetId, orgId)
    .first<{ role: string; joinedAt: string; name: string; email: string }>()
  if (!member) return c.json({ error: "Coach not in this organization" }, 404)

  const stats = await c.env.DB.prepare(
    `SELECT COUNT(*) AS sessions, AVG(duration_seconds) AS avg_duration, MAX(occurred_at) AS last_at
     FROM sessions_log WHERE coach_id = ? AND organization_id = ?`,
  )
    .bind(targetId, orgId)
    .first<{ sessions: number; avg_duration: number | null; last_at: string | null }>()

  const recent = await c.env.DB.prepare(
    `SELECT id, occurred_at, duration_seconds, data
     FROM sessions_log WHERE coach_id = ? AND organization_id = ?
     ORDER BY occurred_at DESC LIMIT 8`,
  )
    .bind(targetId, orgId)
    .all<{
      id: string
      occurred_at: string
      duration_seconds: number | null
      data: string
    }>()

  return c.json({
    coach: {
      id: targetId,
      name: member.name,
      email: member.email,
      role: member.role === "admin" || member.role === "owner" ? "director" : "coach",
      memberRole: member.role,
      joinedAt: member.joinedAt,
      sessions: stats?.sessions ?? 0,
      avgDurationSeconds: stats?.avg_duration
        ? Math.round(stats.avg_duration)
        : null,
      lastEntryAt: stats?.last_at ?? null,
    },
    recentSessions: recent.results.map((r) => {
      const data = JSON.parse(r.data) as {
        topics?: string[]
        format?: string
        referral?: string
      }
      return {
        id: r.id,
        occurredAt: r.occurred_at,
        durationSeconds: r.duration_seconds,
        topic: data.topics?.[0] ?? null,
        format: data.format ?? null,
        referral: data.referral ?? null,
      }
    }),
  })
})

/**
 * Change a member's role within the active org.
 *   { role: "director" | "coach" }
 * Maps to better-auth's "admin" / "member" under the hood.
 */
coaches.post("/:userId/role", async (c) => {
  const orgId = c.get("organizationId")
  const directorId = c.get("user").id
  const targetId = c.req.param("userId")
  const body = (await c.req.json()) as { role: "director" | "coach" }
  if (body.role !== "director" && body.role !== "coach") {
    return c.json({ error: "Invalid role" }, 400)
  }
  if (targetId === directorId) {
    return c.json({ error: "You can't change your own role." }, 400)
  }

  const member = await c.env.DB.prepare(
    `SELECT id, role FROM member WHERE userId = ? AND organizationId = ?`,
  )
    .bind(targetId, orgId)
    .first<{ id: string; role: string }>()
  if (!member) return c.json({ error: "Coach not in this organization" }, 404)
  if (member.role === "owner") {
    return c.json({ error: "Cannot change the owner's role." }, 400)
  }

  const newRole = body.role === "director" ? "admin" : "member"
  await c.env.DB.prepare(`UPDATE member SET role = ? WHERE id = ?`)
    .bind(newRole, member.id)
    .run()
  return c.json({ ok: true, role: body.role })
})

/**
 * Remove a coach from the active org. Sessions remain attributed to their
 * (now-orphaned) coach_id for historical reporting; the user themselves is
 * not deleted from better-auth — they can still sign in to other orgs.
 */
coaches.delete("/:userId", async (c) => {
  const orgId = c.get("organizationId")
  const directorId = c.get("user").id
  const targetId = c.req.param("userId")

  if (targetId === directorId) {
    return c.json({ error: "You can't remove yourself." }, 400)
  }
  const member = await c.env.DB.prepare(
    `SELECT id, role FROM member WHERE userId = ? AND organizationId = ?`,
  )
    .bind(targetId, orgId)
    .first<{ id: string; role: string }>()
  if (!member) return c.json({ error: "Coach not in this organization" }, 404)
  if (member.role === "owner") {
    return c.json({ error: "Cannot remove the owner." }, 400)
  }

  await c.env.DB.prepare(`DELETE FROM member WHERE id = ?`)
    .bind(member.id)
    .run()
  // Invalidate any sessions for the removed user so their cookie stops working.
  await c.env.DB.prepare(`DELETE FROM session WHERE userId = ?`)
    .bind(targetId)
    .run()
  return c.json({ ok: true })
})
