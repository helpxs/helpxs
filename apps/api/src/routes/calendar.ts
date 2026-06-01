import { Hono } from "hono"
import type { App } from "../middleware"
import { requireAuth } from "../middleware"
import {
  authorizeUrl,
  calendlyConfigured,
  exchangeCode,
  fetchCalendlyEvents,
  mockEvents,
  MOCK_PRIOR_SESSIONS,
  MOCK_RETURNING_STUDENT,
  type CalendarEventInput,
} from "../calendly"
import { resolveIdentities, upsertStudent } from "../crosswalk"

export const calendar = new Hono<App>()

calendar.use("*", requireAuth)

type ConnectionRow = {
  coach_id: string
  organization_id: string
  provider: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  account_uri: string | null
  connected_at: string
}

async function getConnection(c: {
  env: App["Bindings"]
  get: (k: "user") => { id: string }
}): Promise<ConnectionRow | null> {
  return c.env.DB.prepare(
    `SELECT * FROM calendar_connections WHERE coach_id = ?`,
  )
    .bind(c.get("user").id)
    .first<ConnectionRow>()
}

/** Upsert resolved events into the crosswalk + calendar_events cache. */
async function syncEvents(
  db: D1Database,
  orgId: string,
  coachId: string,
  events: CalendarEventInput[],
) {
  const now = new Date().toISOString()
  // Clear this coach's cached future/today events before re-inserting.
  await db
    .prepare(`DELETE FROM calendar_events WHERE coach_id = ? AND organization_id = ?`)
    .bind(coachId, orgId)
    .run()
  for (const ev of events) {
    const token = await upsertStudent(db, orgId, {
      name: ev.studentName,
      email: ev.studentEmail ?? null,
      universityId: ev.universityId ?? null,
    })
    await db
      .prepare(
        `INSERT OR REPLACE INTO calendar_events
           (id, coach_id, organization_id, student_token, starts_at, ends_at, event_type, status, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        ev.id,
        coachId,
        orgId,
        token,
        ev.startsAt,
        ev.endsAt ?? null,
        ev.eventType,
        ev.status,
        now,
      )
      .run()
  }
}

// --- Connection status ---
calendar.get("/status", async (c) => {
  const conn = await getConnection(c)
  return c.json({
    connected: Boolean(conn),
    provider: conn?.provider ?? null,
    calendlyConfigured: calendlyConfigured(c.env),
    connectedAt: conn?.connected_at ?? null,
  })
})

// --- Begin Calendly OAuth (returns the authorize URL for the client to open) ---
calendar.get("/authorize", async (c) => {
  if (!calendlyConfigured(c.env)) {
    return c.json({ error: "Calendly is not configured; use mock connect." }, 400)
  }
  // state carries the coach id so the callback can attribute the connection.
  const state = c.get("user").id
  return c.json({ url: authorizeUrl(c.env, state) })
})

// --- Calendly OAuth callback (redirect target) ---
calendar.get("/callback", async (c) => {
  const code = c.req.query("code")
  if (!code) return c.redirect("/coach?calendar=error")
  const orgId = c.get("organizationId")
  const coachId = c.get("user").id
  try {
    const tokens = await exchangeCode(c.env, code)
    const now = new Date().toISOString()
    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO calendar_connections
         (coach_id, organization_id, provider, access_token, refresh_token, expires_at, account_uri, connected_at)
       VALUES (?, ?, 'calendly', ?, ?, ?, ?, ?)`,
    )
      .bind(
        coachId,
        orgId,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresAt,
        tokens.ownerUri,
        now,
      )
      .run()
    // Initial sync of the next two weeks.
    if (tokens.ownerUri) {
      const min = new Date().toISOString()
      const max = new Date(Date.now() + 14 * 86400_000).toISOString()
      const events = await fetchCalendlyEvents(tokens.accessToken, tokens.ownerUri, {
        min,
        max,
      })
      await syncEvents(c.env.DB, orgId, coachId, events)
    }
    return c.redirect("/coach?calendar=connected")
  } catch (err) {
    console.error("Calendly callback failed:", err)
    return c.redirect("/coach?calendar=error")
  }
})

// --- Mock connect (course-prototype): seed a realistic day + recall history ---
calendar.post("/connect/mock", async (c) => {
  const orgId = c.get("organizationId")
  const coachId = c.get("user").id
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO calendar_connections
       (coach_id, organization_id, provider, access_token, refresh_token, expires_at, account_uri, connected_at)
     VALUES (?, ?, 'mock', NULL, NULL, NULL, NULL, ?)`,
  )
    .bind(coachId, orgId, now)
    .run()

  await syncEvents(c.env.DB, orgId, coachId, mockEvents())

  // Seed prior sessions for the returning mock student so recall has content —
  // only if this coach hasn't already got sessions for that token.
  const token = await upsertStudent(c.env.DB, orgId, {
    name: MOCK_RETURNING_STUDENT.name,
    email: MOCK_RETURNING_STUDENT.email,
    universityId: MOCK_RETURNING_STUDENT.universityId,
  })
  const existing = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM sessions_log WHERE organization_id = ? AND student_token = ?`,
  )
    .bind(orgId, token)
    .first<{ n: number }>()
  if ((existing?.n ?? 0) === 0) {
    const formRow = await c.env.DB.prepare(
      `SELECT id FROM form_versions WHERE organization_id = ? ORDER BY id DESC LIMIT 1`,
    )
      .bind(orgId)
      .first<{ id: number }>()
    const formVersion = formRow?.id ?? 1
    for (const prior of MOCK_PRIOR_SESSIONS) {
      const occurredAt = new Date(
        Date.now() - prior.daysAgo * 86400_000,
      ).toISOString()
      await c.env.DB.prepare(
        `INSERT INTO sessions_log
           (id, coach_id, organization_id, form_version, occurred_at, duration_seconds, data, student_token, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          coachId,
          orgId,
          formVersion,
          occurredAt,
          240,
          JSON.stringify({ ...prior.data, date: occurredAt, studentToken: token }),
          token,
          occurredAt,
        )
        .run()
    }
  }

  return c.json({ ok: true, provider: "mock" })
})

// --- Re-sync events ---
calendar.post("/sync", async (c) => {
  const orgId = c.get("organizationId")
  const coachId = c.get("user").id
  const conn = await getConnection(c)
  if (!conn) return c.json({ error: "No calendar connected" }, 400)

  if (conn.provider === "mock") {
    await syncEvents(c.env.DB, orgId, coachId, mockEvents())
    return c.json({ ok: true })
  }
  if (conn.access_token && conn.account_uri) {
    const min = new Date().toISOString()
    const max = new Date(Date.now() + 14 * 86400_000).toISOString()
    const events = await fetchCalendlyEvents(conn.access_token, conn.account_uri, {
      min,
      max,
    })
    await syncEvents(c.env.DB, orgId, coachId, events)
    return c.json({ ok: true })
  }
  return c.json({ error: "Connection is missing credentials" }, 400)
})

type EventRow = {
  id: string
  student_token: string
  starts_at: string
  ends_at: string | null
  event_type: string | null
  status: string | null
}

// --- Today's sessions for this coach ---
calendar.get("/today", async (c) => {
  const orgId = c.get("organizationId")
  const coachId = c.get("user").id

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const rs = await c.env.DB.prepare(
    `SELECT id, student_token, starts_at, ends_at, event_type, status
     FROM calendar_events
     WHERE coach_id = ? AND organization_id = ? AND starts_at >= ? AND starts_at < ?
     ORDER BY starts_at ASC`,
  )
    .bind(coachId, orgId, start.toISOString(), end.toISOString())
    .all<EventRow>()

  const tokens = rs.results.map((r) => r.student_token)
  const identities = await resolveIdentities(c.env.DB, orgId, tokens)

  // Prior-session counts per token (for the returning / first-session badge).
  const priorCounts = new Map<string, number>()
  for (const token of [...new Set(tokens)]) {
    const row = await c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM sessions_log
       WHERE organization_id = ? AND student_token = ?`,
    )
      .bind(orgId, token)
      .first<{ n: number }>()
    priorCounts.set(token, row?.n ?? 0)
  }

  return c.json({
    sessions: rs.results.map((r) => ({
      id: r.id,
      studentToken: r.student_token,
      studentName: identities.get(r.student_token)?.name ?? "Unknown student",
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      eventType: r.event_type,
      status: r.status,
      priorSessions: priorCounts.get(r.student_token) ?? 0,
      returning: (priorCounts.get(r.student_token) ?? 0) > 0,
    })),
  })
})

// --- Single event (for post-session form prefill) ---
calendar.get("/event/:id", async (c) => {
  const orgId = c.get("organizationId")
  const coachId = c.get("user").id
  const row = await c.env.DB.prepare(
    `SELECT id, student_token, starts_at, ends_at, event_type, status
     FROM calendar_events WHERE id = ? AND coach_id = ? AND organization_id = ?`,
  )
    .bind(c.req.param("id"), coachId, orgId)
    .first<EventRow>()
  if (!row) return c.json({ error: "Event not found" }, 404)
  const identities = await resolveIdentities(c.env.DB, orgId, [row.student_token])
  return c.json({
    event: {
      id: row.id,
      studentToken: row.student_token,
      studentName: identities.get(row.student_token)?.name ?? "Unknown student",
      startsAt: row.starts_at,
      eventType: row.event_type,
    },
  })
})
