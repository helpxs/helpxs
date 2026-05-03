import { Hono } from "hono"
import type { App } from "../middleware"
import { requireAuth, requireRole } from "../middleware"
import { chat, llmEnabled } from "../llm"

export const aggregates = new Hono<App>()

aggregates.use("*", requireAuth, requireRole("director"))

type SessionRow = {
  data: string
  occurred_at: string
  duration_seconds: number | null
  coach_id: string
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
  c: { env: App["Bindings"] } & { get: (k: "organizationId") => string },
  since: Date,
): Promise<SessionRow[]> {
  const orgId = c.get("organizationId")
  const rs = await c.env.DB.prepare(
    `SELECT data, occurred_at, duration_seconds, coach_id
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

function fmtDeltaCount(now: number, prev: number) {
  const d = now - prev
  return `${d >= 0 ? "+" : ""}${d}`
}

function avgDuration(rows: SessionRow[]) {
  const dur = rows.map((r) => r.duration_seconds ?? 0).filter((v) => v > 0)
  if (dur.length === 0) return { secs: 0, label: "—" }
  const avg = Math.round(dur.reduce((a, b) => a + b, 0) / dur.length)
  return {
    secs: avg,
    label: `${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, "0")}`,
  }
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

function formatMix(rows: SessionRow[]) {
  const fmt = { individual: 0, group: 0, workshop: 0 }
  for (const r of rows) {
    const f = (JSON.parse(r.data) as { format?: string }).format
    if (f === "individual") fmt.individual++
    else if (f === "group") fmt.group++
    else if (f === "workshop") fmt.workshop++
  }
  return fmt
}

function referrals(rows: SessionRow[]) {
  return rows.filter((r) => {
    const d = JSON.parse(r.data) as { referral?: string }
    return d.referral === "yes"
  }).length
}

function coachCounts(rows: SessionRow[]) {
  const m = new Map<string, number>()
  for (const r of rows) m.set(r.coach_id, (m.get(r.coach_id) ?? 0) + 1)
  return m
}

function interventionCounts(rows: SessionRow[]) {
  const m = new Map<string, number>()
  for (const r of rows) {
    const data = JSON.parse(r.data) as { interventions?: string[] }
    for (const i of data.interventions ?? []) m.set(i, (m.get(i) ?? 0) + 1)
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
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

function demographicMix(rows: SessionRow[]) {
  const buckets = (key: "gender" | "ageRange" | "degreeLevel") => {
    const m = new Map<string, number>()
    for (const r of rows) {
      const v = (JSON.parse(r.data) as Record<string, unknown>)[key]
      if (typeof v === "string" && v) m.set(v, (m.get(v) ?? 0) + 1)
    }
    return Object.fromEntries(m)
  }
  return {
    gender: buckets("gender"),
    ageRange: buckets("ageRange"),
    degreeLevel: buckets("degreeLevel"),
  }
}

/**
 * Build a compact, anonymized summary of the period — this is exactly what
 * gets sent to the LLM. Names, emails, ids are deliberately stripped.
 */
function summarizeForLlm(
  cur: SessionRow[],
  prev: SessionRow[],
  windowLabel: string,
  prevLabel: string,
) {
  const fmt = formatMix(cur)
  const fmtTotal = fmt.individual + fmt.group + fmt.workshop || 1
  const prevFmt = formatMix(prev)
  const prevFmtTotal =
    prevFmt.individual + prevFmt.group + prevFmt.workshop || 1
  return {
    window: windowLabel,
    sessions: cur.length,
    avgEntryTime: avgDuration(cur).label,
    referrals: referrals(cur),
    referralRatePct: cur.length
      ? Math.round((referrals(cur) / cur.length) * 100)
      : 0,
    referralDestinations: referralDestinations(cur),
    formatMixPct: {
      individual: Math.round((fmt.individual / fmtTotal) * 100),
      group: Math.round((fmt.group / fmtTotal) * 100),
      workshop: Math.round((fmt.workshop / fmtTotal) * 100),
    },
    topics: topicCounts(cur),
    interventions: interventionCounts(cur),
    demographics: demographicMix(cur),
    distinctCoaches: new Set(cur.map((r) => r.coach_id)).size,
    weeklyTrend: weeklyBars(cur, 12),
    comparison: {
      label: prevLabel,
      sessions: prev.length,
      sessionsDeltaPct:
        prev.length === 0
          ? cur.length > 0
            ? "+100%"
            : "0%"
          : `${
              (cur.length - prev.length) / prev.length >= 0 ? "+" : ""
            }${Math.round(((cur.length - prev.length) / prev.length) * 100)}%`,
      referrals: referrals(prev),
      formatMixPct: {
        individual: Math.round((prevFmt.individual / prevFmtTotal) * 100),
        group: Math.round((prevFmt.group / prevFmtTotal) * 100),
        workshop: Math.round((prevFmt.workshop / prevFmtTotal) * 100),
      },
      topics: topicCounts(prev).slice(0, 5),
    },
  }
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
  const auth = c.get("auth")

  const w = (c.req.query("window") ?? "quarter") as "week" | "month" | "quarter"
  const window: "week" | "month" | "quarter" =
    w === "week" || w === "month" || w === "quarter" ? w : "quarter"

  const curStart = startOf(window)
  const prevStart = new Date(curStart)
  if (window === "week") prevStart.setDate(prevStart.getDate() - 7)
  else if (window === "month") prevStart.setMonth(prevStart.getMonth() - 1)
  else prevStart.setMonth(prevStart.getMonth() - 3)

  const allSince = new Date(prevStart)
  allSince.setDate(allSince.getDate() - 1)

  const rows = await loadSessions({ env: c.env, get: c.get }, allSince)

  const cur = rows.filter((r) => new Date(r.occurred_at) >= curStart)
  const prev = rows.filter(
    (r) =>
      new Date(r.occurred_at) >= prevStart && new Date(r.occurred_at) < curStart,
  )

  const curAvg = avgDuration(cur)
  const prevAvg = avgDuration(prev)
  const avgDelta =
    curAvg.secs && prevAvg.secs
      ? `${curAvg.secs - prevAvg.secs >= 0 ? "+" : ""}${curAvg.secs - prevAvg.secs}s`
      : "—"

  // last 24h activity
  const last24Cutoff = Date.now() - 24 * 3600 * 1000
  const recentRows = cur.filter(
    (r) => new Date(r.occurred_at).getTime() >= last24Cutoff,
  )
  const recentReferrals = referrals(recentRows)
  const recentCoaches = new Set(recentRows.map((r) => r.coach_id)).size

  // current form version (for "Form vN published" activity entry)
  const formRow = await c.env.DB.prepare(
    `SELECT id, published_at FROM form_versions WHERE organization_id = ? ORDER BY id DESC LIMIT 1`,
  )
    .bind(orgId)
    .first<{ id: number; published_at: string }>()

  // active members count
  const members = await auth.api
    .listMembers({
      query: { organizationId: orgId },
      headers: c.req.raw.headers,
    })
    .catch(() => ({ members: [] }))
  const memberList =
    (members as { members?: Array<{ user: { id: string; name?: string; email?: string } }> })
      ?.members ?? []
  const coachesActive = memberList.length

  const counts = coachCounts(cur)
  const coachLoad = memberList
    .map((m) => ({
      coachId: m.user.id,
      name: m.user.name ?? m.user.email ?? "Unknown",
      count: counts.get(m.user.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)

  const activity: Array<{ title: string; subtitle: string; when: string }> = []
  if (recentRows.length > 0) {
    activity.push({
      title: `${recentRows.length} entries logged`,
      subtitle: `across ${recentCoaches} coaches`,
      when: "24h",
    })
  }
  if (recentReferrals > 0) {
    activity.push({
      title: `${recentReferrals} referrals made`,
      subtitle: "see referral patterns in reports",
      when: "24h",
    })
  }
  if (formRow) {
    const ago = Math.max(
      0,
      Math.round(
        (Date.now() - new Date(formRow.published_at).getTime()) / 86400_000,
      ),
    )
    activity.push({
      title: `Form v${formRow.id} active`,
      subtitle:
        ago === 0 ? "published today" : `published ${ago}d ago`,
      when: ago === 0 ? "today" : `${ago}d`,
    })
  }

  return c.json({
    window,
    kpis: {
      sessions: cur.length,
      sessionsDelta: fmtDeltaPct(cur.length, prev.length),
      coachesActive,
      coachesDelta: fmtDeltaCount(coachesActive, coachesActive),
      avgEntryTime: curAvg.label,
      avgEntryTimeDelta: avgDelta,
      referrals: referrals(cur),
      referralsDelta: fmtDeltaPct(referrals(cur), referrals(prev)),
    },
    weeklySessions: weeklyBars(cur, 12),
    topTopics: topicCounts(cur),
    formatMix: formatMix(cur),
    coachLoad,
    recentActivity: activity,
  })
})

const WINDOW_LABEL: Record<"week" | "month" | "quarter", string> = {
  week: "this week",
  month: "this month",
  quarter: "this quarter",
}

const PREV_LABEL: Record<"week" | "month" | "quarter", string> = {
  week: "last week",
  month: "last month",
  quarter: "last quarter",
}

function startOfPrev(window: "week" | "month" | "quarter") {
  const cur = startOf(window)
  const prev = new Date(cur)
  if (window === "week") prev.setDate(prev.getDate() - 7)
  else if (window === "month") prev.setMonth(prev.getMonth() - 1)
  else prev.setMonth(prev.getMonth() - 3)
  return prev
}

aggregates.get("/report", async (c) => {
  const orgId = c.get("organizationId")
  const auth = c.get("auth")
  const w = (c.req.query("window") ?? "quarter") as
    | "week"
    | "month"
    | "quarter"
    | "custom"
  const window = w === "custom" ? "quarter" : w
  const since = startOf(window)
  const sincePrev = startOfPrev(window)
  const allRows = await loadSessions({ env: c.env, get: c.get }, sincePrev)
  const rows = allRows.filter((r) => new Date(r.occurred_at) >= since)
  const prevRows = allRows.filter(
    (r) => new Date(r.occurred_at) >= sincePrev && new Date(r.occurred_at) < since,
  )

  const fmt = formatMix(rows)
  const refs = referrals(rows)
  const topics = topicCounts(rows)
  const top = topics[0]?.label ?? "—"
  const fmtTotal = fmt.individual + fmt.group + fmt.workshop || 1
  const indPct = Math.round((fmt.individual / fmtTotal) * 100)

  const fallbackNarrative =
    rows.length === 0
      ? "No sessions logged yet for this period."
      : `Across ${WINDOW_LABEL[window]} the program logged ${rows.length} sessions, with ${indPct}% of them in an individual format. ${
          top !== "—" ? `${top} remains the most common topic.` : ""
        } Coaches made ${refs} referrals.`

  let narrative = fallbackNarrative
  let narrativeSource: "llm" | "fallback" = "fallback"
  if (llmEnabled(c.env) && rows.length > 0) {
    try {
      const summary = summarizeForLlm(
        rows,
        prevRows,
        WINDOW_LABEL[window],
        PREV_LABEL[window],
      )
      narrative = await chat(c.env, {
        temperature: 0.4,
        maxTokens: 350,
        messages: [
          {
            role: "system",
            content:
              "You write concise, director-friendly summaries of anonymized coaching program data for Stanford Well-Being Coaching. Audience: program directors. Tone: warm, factual, plain prose. Never speculate about individual students or coaches; the data is aggregate only. Two short paragraphs, no markdown headers or bullet points, no greetings or sign-offs.",
          },
          {
            role: "user",
            content: `Write a ${WINDOW_LABEL[window]} program summary based on this anonymized data. Compare to ${PREV_LABEL[window]} where useful. Highlight: session volume change, dominant topics, intervention patterns, referral patterns, and any notable demographic skew. ~150 words.\n\nDATA:\n${JSON.stringify(summary, null, 2)}`,
          },
        ],
      })
      narrativeSource = "llm"
    } catch (err) {
      console.error("LLM narrative failed:", err)
    }
  }

  const members = await auth.api
    .listMembers({
      query: { organizationId: orgId },
      headers: c.req.raw.headers,
    })
    .catch(() => ({ members: [] }))
  const memberList =
    (members as { members?: Array<{ user: { id: string; name?: string; email?: string } }> })
      ?.members ?? []
  const counts = coachCounts(rows)
  const coachLoad = memberList
    .map((m) => ({
      coachId: m.user.id,
      name: m.user.name ?? m.user.email ?? "Unknown",
      count: counts.get(m.user.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)

  const sessionsDeltaPct =
    prevRows.length === 0
      ? rows.length > 0
        ? "+100%"
        : "—"
      : `${
          rows.length - prevRows.length >= 0 ? "+" : ""
        }${Math.round(((rows.length - prevRows.length) / prevRows.length) * 100)}%`

  return c.json({
    window,
    windowLabel: WINDOW_LABEL[window],
    prevLabel: PREV_LABEL[window],
    narrative,
    narrativeSource,
    kpis: {
      sessions: rows.length,
      sessionsDelta: sessionsDeltaPct,
      coachesActive: new Set(rows.map((r) => r.coach_id)).size,
      coachesDelta: "",
      avgEntryTime: avgDuration(rows).label,
      avgEntryTimeDelta: "",
      referrals: refs,
      referralsDelta:
        prevRows.length === 0
          ? "—"
          : `${
              referrals(rows) - referrals(prevRows) >= 0 ? "+" : ""
            }${referrals(rows) - referrals(prevRows)}`,
    },
    weeklySessions: weeklyBars(rows, 12),
    topTopics: topics,
    interventions: interventionCounts(rows),
    referralDestinations: referralDestinations(rows),
    demographics: demographicMix(rows),
    formatMix: fmt,
    coachLoad,
    comparison: {
      sessions: prevRows.length,
      topTopics: topicCounts(prevRows).slice(0, 5),
    },
    recentActivity: [],
  })
})

/**
 * LLM-powered "what's notable about this quarter" — a small list of bullet
 * insights for the dashboard. Falls back to deterministic observations if the
 * LLM is unavailable.
 */
aggregates.get("/insights", async (c) => {
  const quarterStart = startOf("quarter")
  const prevQuarterStart = new Date(quarterStart)
  prevQuarterStart.setMonth(prevQuarterStart.getMonth() - 3)
  const allRows = await loadSessions(
    { env: c.env, get: c.get },
    prevQuarterStart,
  )
  const cur = allRows.filter((r) => new Date(r.occurred_at) >= quarterStart)
  const prev = allRows.filter(
    (r) =>
      new Date(r.occurred_at) >= prevQuarterStart &&
      new Date(r.occurred_at) < quarterStart,
  )

  if (cur.length === 0) {
    return c.json({
      source: "fallback" as const,
      insights: [
        "No sessions logged yet this quarter — the dashboard will fill in once coaches start submitting entries.",
      ],
    })
  }

  if (!llmEnabled(c.env)) {
    return c.json({
      source: "fallback" as const,
      insights: deterministicInsights(cur, prev),
    })
  }

  try {
    const summary = summarizeForLlm(cur, prev, "this quarter", "last quarter")
    const raw = await chat(c.env, {
      temperature: 0.5,
      maxTokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You produce 3-5 concise insights about an anonymized coaching program for a director's dashboard. Each insight is one short sentence (≤ 22 words), starts with a strong observation, and is grounded in the data provided. Return JSON: {\"insights\": [\"...\", \"...\"]}. No markdown, no preamble.",
        },
        {
          role: "user",
          content: `Find 3-5 noteworthy patterns this quarter vs last. Look for: shifting topic mix, intervention shifts, referral trends, format mix shifts, or notable demographic concentrations. Skip anything that's flat or trivially expected.\n\nDATA:\n${JSON.stringify(summary, null, 2)}`,
        },
      ],
      responseFormat: "json_object",
    })
    let parsed: { insights?: string[] } | null = null
    try {
      parsed = JSON.parse(raw) as { insights?: string[] }
    } catch {
      // ignore — falls through to deterministic
    }
    const insights = parsed?.insights?.filter(
      (s): s is string => typeof s === "string" && s.length > 0,
    )
    if (!insights || insights.length === 0) {
      return c.json({
        source: "fallback" as const,
        insights: deterministicInsights(cur, prev),
      })
    }
    return c.json({ source: "llm" as const, insights })
  } catch (err) {
    console.error("LLM insights failed:", err)
    return c.json({
      source: "fallback" as const,
      insights: deterministicInsights(cur, prev),
    })
  }
})

function deterministicInsights(cur: SessionRow[], prev: SessionRow[]) {
  const out: string[] = []
  const curTopics = topicCounts(cur)
  const prevTopics = topicCounts(prev)
  if (curTopics[0]) {
    out.push(`${curTopics[0].label} is the top topic with ${curTopics[0].count} sessions.`)
  }
  // Topic deltas
  const prevMap = new Map(prevTopics.map((t) => [t.label, t.count]))
  const risers = curTopics
    .map((t) => ({ ...t, delta: t.count - (prevMap.get(t.label) ?? 0) }))
    .filter((t) => t.delta > 1)
    .sort((a, b) => b.delta - a.delta)
  if (risers[0]) {
    out.push(`${risers[0].label} grew by ${risers[0].delta} sessions vs last quarter.`)
  }
  const refs = referrals(cur)
  if (refs > 0) {
    out.push(
      `${refs} referrals made this quarter (${Math.round(
        (refs / cur.length) * 100,
      )}% of sessions).`,
    )
  }
  const fmt = formatMix(cur)
  const fmtTotal = fmt.individual + fmt.group + fmt.workshop || 1
  out.push(
    `${Math.round((fmt.individual / fmtTotal) * 100)}% of sessions are individual format.`,
  )
  return out.slice(0, 5)
}
