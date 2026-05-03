import { Hono } from "hono"
import { hashPassword } from "better-auth/crypto"
import type { App } from "../middleware"

export const passwordResets = new Hono<App>()

const TOKEN_TTL_HOURS = 48

/**
 * Public lookup. Used by the reset page to show "Setting password for X"
 * before the user submits.
 */
passwordResets.get("/:token", async (c) => {
  const token = c.req.param("token")
  const row = await c.env.DB.prepare(
    `SELECT t.expires_at, t.used_at, u.email, u.name
     FROM password_reset_tokens t
     JOIN user u ON u.id = t.user_id
     WHERE t.id = ?`,
  )
    .bind(token)
    .first<{ expires_at: string; used_at: string | null; email: string; name: string }>()
  if (!row) return c.json({ error: "Reset link not found" }, 404)
  if (row.used_at)
    return c.json({ error: "Reset link already used" }, 410)
  if (new Date(row.expires_at).getTime() < Date.now())
    return c.json({ error: "Reset link expired" }, 410)
  return c.json({
    reset: { email: row.email, name: row.name, expiresAt: row.expires_at },
  })
})

/**
 * Public set-password. Verifies token, updates the credential account, marks
 * the token used.
 */
passwordResets.post("/:token", async (c) => {
  const token = c.req.param("token")
  const body = (await c.req.json()) as { password: string }
  if (!body.password || body.password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters." }, 400)
  }

  const row = await c.env.DB.prepare(
    `SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE id = ?`,
  )
    .bind(token)
    .first<{ user_id: string; expires_at: string; used_at: string | null }>()
  if (!row) return c.json({ error: "Reset link not found" }, 404)
  if (row.used_at)
    return c.json({ error: "Reset link already used" }, 410)
  if (new Date(row.expires_at).getTime() < Date.now())
    return c.json({ error: "Reset link expired" }, 410)

  const hashed = await hashPassword(body.password)

  // Update the credential account row. Better-auth's email/password provider
  // stores the hash in `account.password` keyed by providerId='credential'.
  await c.env.DB.prepare(
    `UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'`,
  )
    .bind(hashed, row.user_id)
    .run()

  // Invalidate any active sessions for this user — they should re-sign in
  // with the new password.
  await c.env.DB.prepare(`DELETE FROM session WHERE userId = ?`)
    .bind(row.user_id)
    .run()

  await c.env.DB.prepare(
    `UPDATE password_reset_tokens SET used_at = ? WHERE id = ?`,
  )
    .bind(new Date().toISOString(), token)
    .run()

  return c.json({ ok: true })
})

export { TOKEN_TTL_HOURS }
