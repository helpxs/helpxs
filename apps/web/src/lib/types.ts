// Shared API + form types. Mirrors the API route responses.

// Post-session form draft. Only `studentToken` links to identity — the
// student's name is never part of the submitted payload (it's display-only,
// fetched from the calendar event). Everything here is persisted into
// sessions_log.data, so it must stay identifier-free.
export type SessionDraft = {
  // Auto-populated from the calendar event (read-only in the form)
  studentToken: string
  date: string // ISO date from the calendar event
  sessionType: string
  // Coach-filled
  occurred: "occurred" | "no-show" | "cancelled"
  topics: string[]
  whatDiscussed: string
  whatDid: string
  activities: string[]
  referral: "yes" | "no"
  referralDestinations: string[]
  ocsProcess: "yes" | "no"
  // Custom field answers keyed by field id
  custom: Record<string, unknown>
  // Meta
  startedAt: number
}

export type Session = {
  id: string
  coachId: string
  organizationId: string
  formVersion: number
  occurredAt: string
  durationSeconds: number | null
  data: SessionDraft
  createdAt: string
}

export type FormFieldType =
  | "single-select"
  | "multi-select"
  | "yes-no"
  | "rating-1-5"
  | "short-text"
  | "long-text"
  | "number"
  | "date"

export type FormField = {
  id: string
  label: string
  type: FormFieldType
  options?: string[]
  required: boolean
  core: boolean
  auto?: boolean
  custom?: boolean
  includeInReporting?: boolean
}

export type FormVersion = {
  id: number
  organizationId: string
  schema: { fields: FormField[] }
  publishedAt: string
  publishedBy: string
  entryCount: number
}

export type Coach = {
  id: string
  name: string
  email: string
  sessions: number
  lastEntryAt: string | null
  status: "active" | "invited"
}

export type LabelCount = { label: string; count: number }

// --- Calendar / recall ---

export type CalendarStatus = {
  connected: boolean
  provider: "calendly" | "mock" | null
  calendlyConfigured: boolean
  connectedAt: string | null
}

export type TodaySession = {
  id: string
  studentToken: string
  studentName: string
  startsAt: string
  endsAt: string | null
  eventType: string | null
  status: string | null
  priorSessions: number
  returning: boolean
}

export type CalendarEvent = {
  id: string
  studentToken: string
  studentName: string
  startsAt: string
  eventType: string | null
}

export type RecallSummary = {
  studentName: string
  firstSession: boolean
  sessionCount: number
  lastSessionAt: string | null
  background: Array<{ date: string; text: string }>
  themes: LabelCount[]
  strategies: { skills: string[]; notes: Array<{ date: string; text: string }> }
}

// --- Director dashboard (minimal) ---

export type AggregateOverview = {
  window: "week" | "month" | "quarter"
  kpis: {
    sessions: number
    sessionsDelta: string
    students: number
    referrals: number
    referralsDelta: string
  }
  weeklySessions: number[] // last 12 weeks
  topTopics: LabelCount[]
  referralDestinations: LabelCount[]
  recentActivity: Array<{ title: string; subtitle: string; when: string }>
}
