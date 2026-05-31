import { Hono } from "hono"
import type { App } from "../middleware"
import { requireAuth, requireRole } from "../middleware"

// Minimal director analytics per the new PRD: session volume, top presenting
// topics, and referral patterns — enough to preserve existing reporting without
// regression — plus a token-only CSV export for the director's own reporting.
//
// Every query in this file operates exclusively on pseudonymous tokens and
// structured fields. The student crosswalk is never joined here, so no raw
// student identity can surface in any director view or export.

export const aggregates = new Hono<App>()

aggregates.use("*", requireAuth, requireRole("director"))

type SessionRow = {
  data: string
  occurred_at: string
  coach_id: string
  student_token: string | null
}

function startOf(window: "week" | "month" | "quarter") {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (window === "week") {
    d.setDate(d.getDate() - d.getDay())
  } else if (window === "month") {
    d.setDate(1)
  } else {
    const m = d.getMonth()
    d.setMonth(m - (m % 3))
    d.setDate(1)
  }
  return d
}

async function loadSessions(
  env: App["Bindings"],
  orgId: string,
  since: Date,
): Promise<SessionRow[]> {
  const rs = await env.DB.prepare(
    `SELECT data, occurred_at, coach_id, student_token
     FROM sessions_log WHERE organization_id = ? AND occurred_at >= ?`,
  )
    .bind(orgId, since.toISOString())
    .all<SessionRow>()
  return rs.results
}

function fmtDeltaPct(now: number, prev: number) {
  if (prev === 0) return now > 0 ? "+100%" : "—"
  const d = ((now - prev) / prev) * 100
  return `${d >= 0 ? "+" : ""}${Math.round(d)}%`
}

function topicCounts(rows: SessionRow[]) {
  const m = new Map<string, number>()
  for (const r of rows) {
    const data = JSON.parse(r.data) as { topics?: string[] }
    for (const t of data.topics ?? []) m.set(t, (m.get(t) ?? 0) + 1)
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

function referralCount(rows: SessionRow[]) {
  return rows.filter((r) => {
    const d = JSON.parse(r.data) as { referral?: string }
    return d.referral === "yes"
  }).length
}

function referralDestinations(rows: SessionRow[]) {
  const m = new Map<string, number>()
  for (const r of rows) {
    const data = JSON.parse(r.data) as {
      referral?: string
      referralDestinations?: string[]
    }
    if (data.referral !== "yes") continue
    for (const d of data.referralDestinations ?? []) {
      m.set(d, (m.get(d) ?? 0) + 1)
    }
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

function weeklyBars(rows: SessionRow[], weeks = 12) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  now.setDate(now.getDate() - now.getDay()) // Sunday
  const result = Array(weeks).fill(0) as number[]
  for (const r of rows) {
    const t = new Date(r.occurred_at).getTime()
    for (let i = 0; i < weeks; i++) {
      const start = now.getTime() - (weeks - 1 - i) * 7 * 86400_000
      const end = start + 7 * 86400_000
      if (t >= start && t < end) {
        result[i]++
        break
      }
    }
  }
  return result
}

aggregates.get("/overview", async (c) => {
  const orgId = c.get("organizationId")

  const w = (c.req.query("window") ?? "quarter") as "week" | "month" | "quarter"
  const window: "week" | "month" | "quarter" =
    w === "week" || w === "month" || w === "quarter" ? w : "quarter"

  const curStart = startOf(window)
  const prevStart = new Date(curStart)
  if (window === "week") prevStart.setDate(prevStart.getDate() - 7)
  else if (window === "month") prevStart.setMonth(prevStart.getMonth() - 1)
  else prevStart.setMonth(prevStart.getMonth() - 3)

  // Load enough history to draw the 12-week trend and compute the prev period.
  const trendStart = new Date()
  trendStart.setDate(trendStart.getDate() - 12 * 7)
  const since = trendStart < prevStart ? trendStart : prevStart

  const rows = await loadSessions(c.env, orgId, since)
  const cur = rows.filter((r) => new Date(r.occurred_at) >= curStart)
  const prev = rows.filter(
    (r) =>
      new Date(r.occurred_at) >= prevStart && new Date(r.occurred_at) < curStart,
  )

  // recent activity (last 24h)
  const last24Cutoff = Date.now() - 24 * 3600 * 1000
  const recentRows = cur.filter(
    (r) => new Date(r.occurred_at).getTime() >= last24Cutoff,
  )
  const activity: Array<{ title: string; subtitle: string; when: string }> = []
  if (recentRows.length > 0) {
    activity.push({
      title: `${recentRows.length} entries logged`,
      subtitle: `across ${new Set(recentRows.map((r) => r.coach_id)).size} coaches`,
      when: "24h",
    })
  }
  const recentRefs = referralCount(recentRows)
  if (recentRefs > 0) {
    activity.push({
      title: `${recentRefs} referrals made`,
      subtitle: "see referral patterns below",
      when: "24h",
    })
  }

  return c.json({
    window,
    kpis: {
      sessions: cur.length,
      sessionsDelta: fmtDeltaPct(cur.length, prev.length),
      students: new Set(cur.map((r) => r.student_token).filter(Boolean)).size,
      referrals: referralCount(cur),
      referralsDelta: fmtDeltaPct(referralCount(cur), referralCount(prev)),
    },
    weeklySessions: weeklyBars(rows, 12),
    topTopics: topicCounts(cur),
    referralDestinations: referralDestinations(cur),
    recentActivity: activity,
  })
})

// --- Token-only CSV export (no student identity, ever) ---
function csvCell(v: unknown): string {
  const s =
    v == null
      ? ""
      : Array.isArray(v)
        ? v.join("; ")
        : typeof v === "object"
          ? JSON.stringify(v)
          : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

aggregates.get("/export.csv", async (c) => {
  const orgId = c.get("organizationId")
  const rs = await c.env.DB.prepare(
    `SELECT id, coach_id, form_version, occurred_at, duration_seconds, data, student_token
     FROM sessions_log WHERE organization_id = ? ORDER BY occurred_at DESC`,
  )
    .bind(orgId)
    .all<{
      id: string
      coach_id: string
      form_version: number
      occurred_at: string
      duration_seconds: number | null
      data: string
      student_token: string | null
    }>()

  const headers = [
    "session_id",
    "coach_id",
    "student_token",
    "form_version",
    "occurred_at",
    "duration_seconds",
    "session_type",
    "occurred",
    "topics",
    "what_discussed",
    "what_did",
    "activities",
    "referral",
    "referral_destinations",
    "ocs_process",
  ]

  const lines = [headers.join(",")]
  for (const r of rs.results) {
    const d = JSON.parse(r.data) as Record<string, unknown>
    lines.push(
      [
        r.id,
        r.coach_id,
        r.student_token ?? "",
        r.form_version,
        r.occurred_at,
        r.duration_seconds ?? "",
        d.sessionType,
        d.occurred,
        d.topics,
        d.whatDiscussed,
        d.whatDid,
        d.activities,
        d.referral,
        d.referralDestinations,
        d.ocsProcess,
      ]
        .map(csvCell)
        .join(","),
    )
  }

  const csv = lines.join("\n")
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="helpxs-sessions.csv"`,
    },
  })
})
