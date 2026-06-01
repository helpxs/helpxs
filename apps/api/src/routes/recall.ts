import { Hono } from "hono"
import type { App } from "../middleware"
import { requireAuth } from "../middleware"
import { resolveIdentity } from "../crosswalk"

// Pre-session recall: a structured summary of a student's prior sessions,
// derived from past PSAT entries linked by pseudonymous token. Per the PRD the
// view presents three derived sections — Background, Themes, and Prior
// Recommended Strategies & Goals — plus a first-session indicator when no prior
// records exist. The student's name is resolved through the access-controlled
// crosswalk (the one place, besides form prefill, that may do so).

export const recall = new Hono<App>()

recall.use("*", requireAuth)

type Row = {
  occurred_at: string
  data: string
}

type PriorData = {
  topics?: string[]
  activities?: string[]
  whatDiscussed?: string
  whatDid?: string
  sessionType?: string
}

recall.get("/:token", async (c) => {
  const orgId = c.get("organizationId")
  const token = c.req.param("token")

  const identity = await resolveIdentity(c.env.DB, orgId, token)

  const rs = await c.env.DB.prepare(
    `SELECT occurred_at, data FROM sessions_log
     WHERE organization_id = ? AND student_token = ?
     ORDER BY occurred_at ASC`,
  )
    .bind(orgId, token)
    .all<Row>()

  const rows = rs.results.map((r) => ({
    occurredAt: r.occurred_at,
    data: JSON.parse(r.data) as PriorData,
  }))

  if (rows.length === 0) {
    return c.json({
      studentName: identity?.name ?? "this student",
      firstSession: true,
      sessionCount: 0,
      lastSessionAt: null,
      background: [],
      themes: [],
      strategies: { skills: [], notes: [] },
    })
  }

  // Background — chronological "what did you talk about?" notes.
  const background = rows
    .filter((r) => r.data.whatDiscussed?.trim())
    .map((r) => ({ date: r.occurredAt, text: r.data.whatDiscussed!.trim() }))

  // Themes — aggregated topic counts, most frequent first.
  const themeCounts = new Map<string, number>()
  for (const r of rows) {
    for (const t of r.data.topics ?? []) {
      themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1)
    }
  }
  const themes = [...themeCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  // Prior recommended strategies & goals — skills used + "what did you do?".
  const strategySet = new Set<string>()
  for (const r of rows) for (const a of r.data.activities ?? []) strategySet.add(a)
  const strategyNotes = rows
    .filter((r) => r.data.whatDid?.trim())
    .map((r) => ({ date: r.occurredAt, text: r.data.whatDid!.trim() }))

  return c.json({
    studentName: identity?.name ?? "this student",
    firstSession: false,
    sessionCount: rows.length,
    lastSessionAt: rows[rows.length - 1].occurredAt,
    background,
    themes,
    strategies: {
      skills: [...strategySet],
      notes: strategyNotes,
    },
  })
})
