import { Hono } from "hono"
import type { App } from "../middleware"
import { requireAuth } from "../middleware"

export const sessions = new Hono<App>()

sessions.use("*", requireAuth)

type SessionRow = {
  id: string
  coach_id: string
  organization_id: string
  form_version: number
  occurred_at: string
  duration_seconds: number | null
  data: string
  created_at: string
}

function rowToSession(r: SessionRow) {
  return {
    id: r.id,
    coachId: r.coach_id,
    organizationId: r.organization_id,
    formVersion: r.form_version,
    occurredAt: r.occurred_at,
    durationSeconds: r.duration_seconds ?? null,
    data: JSON.parse(r.data),
    createdAt: r.created_at,
  }
}

sessions.get("/me", async (c) => {
  const userId = c.get("user").id
  const orgId = c.get("organizationId")
  const rs = await c.env.DB.prepare(
    `SELECT id, coach_id, organization_id, form_version, occurred_at, duration_seconds, data, created_at
     FROM sessions_log WHERE coach_id = ? AND organization_id = ? ORDER BY occurred_at DESC LIMIT 50`,
  )
    .bind(userId, orgId)
    .all<SessionRow>()
  return c.json({ sessions: rs.results.map(rowToSession) })
})

// Director: list all sessions in org with optional filters.
sessions.get("/", async (c) => {
  const role = c.get("role")
  if (role !== "director") {
    return c.json({ error: "Forbidden — director only" }, 403)
  }
  const orgId = c.get("organizationId")
  const url = new URL(c.req.url)
  const coachId = url.searchParams.get("coach")
  const since = url.searchParams.get("since")
  const until = url.searchParams.get("until")
  const topic = url.searchParams.get("topic")
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500)
  const offset = Math.max(Number(url.searchParams.get("offset") ?? "0"), 0)

  const where: string[] = ["organization_id = ?"]
  const binds: unknown[] = [orgId]
  if (coachId) {
    where.push("coach_id = ?")
    binds.push(coachId)
  }
  if (since) {
    where.push("occurred_at >= ?")
    binds.push(since)
  }
  if (until) {
    where.push("occurred_at < ?")
    binds.push(until)
  }
  if (topic) {
    where.push("data LIKE ?")
    binds.push(`%${JSON.stringify(topic).slice(1, -1)}%`)
  }

  const sql = `SELECT id, coach_id, organization_id, form_version, occurred_at, duration_seconds, data, created_at
     FROM sessions_log WHERE ${where.join(" AND ")} ORDER BY occurred_at DESC LIMIT ? OFFSET ?`
  const rs = await c.env.DB.prepare(sql)
    .bind(...binds, limit, offset)
    .all<SessionRow>()

  const countSql = `SELECT COUNT(*) as n FROM sessions_log WHERE ${where.join(" AND ")}`
  const countRow = await c.env.DB.prepare(countSql)
    .bind(...binds)
    .first<{ n: number }>()

  return c.json({
    sessions: rs.results.map(rowToSession),
    total: countRow?.n ?? 0,
    limit,
    offset,
  })
})

// Coach can fetch own; director can fetch any in their org.
sessions.get("/:id", async (c) => {
  const userId = c.get("user").id
  const orgId = c.get("organizationId")
  const role = c.get("role")
  const id = c.req.param("id")

  const row = await c.env.DB.prepare(
    `SELECT id, coach_id, organization_id, form_version, occurred_at, duration_seconds, data, created_at
     FROM sessions_log WHERE id = ? AND organization_id = ?`,
  )
    .bind(id, orgId)
    .first<SessionRow>()

  if (!row) return c.json({ error: "Not found" }, 404)
  if (role !== "director" && row.coach_id !== userId) {
    return c.json({ error: "Forbidden" }, 403)
  }
  return c.json({ session: rowToSession(row) })
})

sessions.post("/", async (c) => {
  const userId = c.get("user").id
  const orgId = c.get("organizationId")
  const body = (await c.req.json()) as {
    draft: { date: string; topics?: string[]; interventions?: string[] } & Record<
      string,
      unknown
    >
    durationSeconds?: number
  }

  if (!body.draft) return c.json({ error: "Missing draft" }, 400)

  // Resolve current form version
  const formRow = await c.env.DB.prepare(
    `SELECT id FROM form_versions WHERE organization_id = ? ORDER BY id DESC LIMIT 1`,
  )
    .bind(orgId)
    .first<{ id: number }>()
  const formVersion = formRow?.id ?? 1

  // Resolve occurredAt
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const occurredAt =
    body.draft.date === "today"
      ? today.toISOString()
      : body.draft.date === "yesterday"
        ? yesterday.toISOString()
        : new Date(body.draft.date).toISOString()

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT INTO sessions_log (id, coach_id, organization_id, form_version, occurred_at, duration_seconds, data, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      userId,
      orgId,
      formVersion,
      occurredAt,
      body.durationSeconds ?? null,
      JSON.stringify(body.draft),
      now,
    )
    .run()

  return c.json({
    session: {
      id,
      coachId: userId,
      organizationId: orgId,
      formVersion,
      occurredAt,
      durationSeconds: body.durationSeconds ?? null,
      data: body.draft,
      createdAt: now,
    },
  })
})
