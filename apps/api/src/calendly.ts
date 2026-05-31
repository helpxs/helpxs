// Calendly OAuth + scheduled-events fetch, with a deterministic mock source so
// the full flow runs without real Calendly credentials (course-prototype mode).
//
// When CALENDLY_CLIENT_ID / CALENDLY_CLIENT_SECRET are set the real OAuth flow
// is used. Otherwise the coach can connect a "mock" calendar that seeds a
// realistic day of appointments (one returning student, two first sessions).

import type { Bindings } from "./middleware"

const CALENDLY_AUTH = "https://auth.calendly.com"
const CALENDLY_API = "https://api.calendly.com"

/** Normalized event shape used by the sync pipeline. */
export type CalendarEventInput = {
  id: string
  studentName: string
  studentEmail?: string | null
  universityId?: string | null
  startsAt: string
  endsAt?: string | null
  eventType: string
  status: string
}

export function calendlyConfigured(env: Bindings): boolean {
  return Boolean(env.CALENDLY_CLIENT_ID && env.CALENDLY_CLIENT_SECRET)
}

function redirectUri(env: Bindings): string {
  return env.CALENDLY_REDIRECT_URI ?? `${env.BETTER_AUTH_URL}/api/calendar/callback`
}

export function authorizeUrl(env: Bindings, state: string): string {
  const u = new URL(`${CALENDLY_AUTH}/oauth/authorize`)
  u.searchParams.set("client_id", env.CALENDLY_CLIENT_ID!)
  u.searchParams.set("response_type", "code")
  u.searchParams.set("redirect_uri", redirectUri(env))
  u.searchParams.set("state", state)
  return u.toString()
}

export type CalendlyTokens = {
  accessToken: string
  refreshToken: string | null
  expiresAt: string | null
  ownerUri: string | null
}

export async function exchangeCode(
  env: Bindings,
  code: string,
): Promise<CalendlyTokens> {
  const res = await fetch(`${CALENDLY_AUTH}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.CALENDLY_CLIENT_ID!,
      client_secret: env.CALENDLY_CLIENT_SECRET!,
      redirect_uri: redirectUri(env),
      code,
    }),
  })
  if (!res.ok) {
    throw new Error(`Calendly token exchange failed: ${res.status} ${await res.text()}`)
  }
  const json = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    owner?: string
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : null,
    ownerUri: json.owner ?? null,
  }
}

async function calendlyGet<T>(accessToken: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`Calendly GET ${url} failed: ${res.status}`)
  }
  return (await res.json()) as T
}

/**
 * Fetch scheduled events for the connected user in a time window, resolving the
 * primary invitee (name + email) for each so we can derive a student token.
 */
export async function fetchCalendlyEvents(
  accessToken: string,
  ownerUri: string,
  range: { min: string; max: string },
): Promise<CalendarEventInput[]> {
  const eventsUrl = new URL(`${CALENDLY_API}/scheduled_events`)
  eventsUrl.searchParams.set("user", ownerUri)
  eventsUrl.searchParams.set("min_start_time", range.min)
  eventsUrl.searchParams.set("max_start_time", range.max)
  eventsUrl.searchParams.set("count", "100")

  const events = await calendlyGet<{
    collection: Array<{
      uri: string
      name: string
      start_time: string
      end_time: string
      status: string
    }>
  }>(accessToken, eventsUrl.toString())

  const out: CalendarEventInput[] = []
  for (const ev of events.collection) {
    let studentName = "Unknown"
    let studentEmail: string | null = null
    try {
      const invitees = await calendlyGet<{
        collection: Array<{ name: string; email: string }>
      }>(accessToken, `${ev.uri}/invitees`)
      const first = invitees.collection[0]
      if (first) {
        studentName = first.name
        studentEmail = first.email
      }
    } catch {
      // invitee fetch can fail on lower API tiers — keep the event anyway.
    }
    out.push({
      id: ev.uri.split("/").pop() ?? ev.uri,
      studentName,
      studentEmail,
      startsAt: ev.start_time,
      endsAt: ev.end_time,
      eventType: ev.name,
      status: ev.status === "active" ? "active" : "canceled",
    })
  }
  return out
}

/**
 * Deterministic mock day — three appointments today. "Jordan Rivera" is a
 * returning student (mock connect also seeds their prior sessions so the recall
 * view has content); the others are first sessions.
 */
export function mockEvents(): CalendarEventInput[] {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  const at = (h: number, m: number) => {
    const d = new Date(base)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  return [
    {
      id: "mock-evt-1",
      studentName: "Jordan Rivera",
      studentEmail: "jrivera@stanford.edu",
      universityId: "06123001",
      startsAt: at(10, 0),
      endsAt: at(10, 45),
      eventType: "Follow-up",
      status: "active",
    },
    {
      id: "mock-evt-2",
      studentName: "Sam Chen",
      studentEmail: "samchen@stanford.edu",
      universityId: "06123002",
      startsAt: at(13, 30),
      endsAt: at(14, 15),
      eventType: "Initial",
      status: "active",
    },
    {
      id: "mock-evt-3",
      studentName: "Priya Nair",
      studentEmail: "pnair@stanford.edu",
      universityId: "06123003",
      startsAt: at(15, 0),
      endsAt: at(15, 45),
      eventType: "Follow-up",
      status: "active",
    },
  ]
}

/**
 * Prior sessions to seed for the returning mock student so the pre-session
 * recall view demonstrates Background / Themes / Strategies. Returned as
 * partial SessionDraft payloads keyed by how many days ago they occurred.
 */
export const MOCK_RETURNING_STUDENT = {
  name: "Jordan Rivera",
  email: "jrivera@stanford.edu",
  universityId: "06123001",
}

export const MOCK_PRIOR_SESSIONS = [
  {
    daysAgo: 21,
    data: {
      sessionType: "Initial",
      occurred: "occurred",
      topics: ["Academic stress", "Time management"],
      whatDiscussed:
        "First year of a master's program, feeling overwhelmed by coursework volume and a sense of impostor syndrome among peers.",
      whatDid:
        "Mapped the week into time blocks together and introduced a values-clarification exercise to reconnect with why they chose the program.",
      activities: ["Time / planning tools", "Values clarification", "Active listening"],
      referral: "no",
      referralDestinations: [],
      ocsProcess: "no",
    },
  },
  {
    daysAgo: 7,
    data: {
      sessionType: "Follow-up",
      occurred: "occurred",
      topics: ["Academic stress", "Sleep & wellbeing", "Anxiety"],
      whatDiscussed:
        "Time-blocking helped a little but sleep has gotten worse before deadlines and anxiety is spiking the night before submissions.",
      whatDid:
        "Practiced a short body-scan and box-breathing routine, and set a goal of a fixed wind-down time three nights this week.",
      activities: ["Body scan / grounding", "Breathing exercises", "Goal-setting"],
      referral: "no",
      referralDestinations: [],
      ocsProcess: "no",
    },
  },
] as const
