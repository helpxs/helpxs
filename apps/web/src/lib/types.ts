// Shared API + form types. Mirrors apps/api/src/schema.ts as the source of truth.

export type SessionDraft = {
  // Step 1 — context
  date: "today" | "yesterday" | string // ISO date for "Pick…"
  occurred: "yes" | "no-show" | "cancelled"
  type: "initial" | "follow-up" | "drop-in" | "group-checkin"
  format: "individual" | "group" | "workshop"
  // Step 2 — who
  gender: string
  ageRange: string
  degreeLevel: string
  // Step 3 — topic (multi)
  topics: string[]
  // Step 4 — intervention (multi)
  interventions: string[]
  // Step 5 — referral
  referral: "yes" | "no"
  referralDestinations: string[]
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
  | "number"
  | "date"

export type FormField = {
  id: string
  label: string
  type: FormFieldType
  options?: string[]
  required: boolean
  core: boolean
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

export type CoachLoadEntry = {
  coachId: string
  name: string
  count: number
}

export type LabelCount = { label: string; count: number }

export type AggregateOverview = {
  kpis: {
    sessions: number
    sessionsDelta: string
    coachesActive: number
    coachesDelta: string
    avgEntryTime: string
    avgEntryTimeDelta: string
    referrals: number
    referralsDelta: string
  }
  weeklySessions: number[] // last 12 weeks
  topTopics: LabelCount[]
  formatMix: { individual: number; group: number; workshop: number }
  coachLoad: CoachLoadEntry[]
  recentActivity: Array<{ title: string; subtitle: string; when: string }>
}

export type ReportData = AggregateOverview & {
  window: "week" | "month" | "quarter"
  windowLabel: string
  prevLabel: string
  narrative: string
  narrativeSource: "llm" | "fallback"
  interventions: LabelCount[]
  referralDestinations: LabelCount[]
  demographics: {
    gender: Record<string, number>
    ageRange: Record<string, number>
    degreeLevel: Record<string, number>
  }
  comparison: {
    sessions: number
    topTopics: LabelCount[]
  }
}
