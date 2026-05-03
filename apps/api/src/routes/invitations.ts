import { Hono } from "hono"
import type { App } from "../middleware"

export const invitations = new Hono<App>()

/**
 * Public lookup of an invitation by id. Used by the accept-invite page so the
 * invitee can see "You've been invited as Coach to {org}" before they sign up.
 * No auth: the invitation id IS the secret (long random string).
 */
invitations.get("/:id", async (c) => {
  const id = c.req.param("id")
  const row = await c.env.DB.prepare(
    `SELECT i.id, i.email, i.role, i.organizationId, i.status, i.expiresAt, o.name AS org_name
     FROM invitation i
     JOIN organization o ON o.id = i.organizationId
     WHERE i.id = ?`,
  )
    .bind(id)
    .first<{
      id: string
      email: string
      role: string
      organizationId: string
      status: string
      expiresAt: string
      org_name: string
    }>()
  if (!row) return c.json({ error: "Invitation not found" }, 404)
  if (row.status !== "pending")
    return c.json({ error: `Invitation already ${row.status}` }, 410)
  if (new Date(row.expiresAt).getTime() < Date.now())
    return c.json({ error: "Invitation expired" }, 410)
  return c.json({
    invitation: {
      id: row.id,
      email: row.email,
      role: row.role === "admin" || row.role === "owner" ? "director" : "coach",
      organizationId: row.organizationId,
      organizationName: row.org_name,
      expiresAt: row.expiresAt,
    },
  })
})
