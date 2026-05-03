import type {
  AggregateOverview,
  Coach,
  FormVersion,
  ReportData,
  Session,
  SessionDraft,
} from "./types"

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  })
  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    const msg =
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`
    throw new ApiError(res.status, msg)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export type Me = {
  user: { id: string; email: string; name: string }
  organizationId: string
  role: "director" | "coach"
}

export const api = {
  // Identity
  me: () => request<Me>("/api/me"),

  // Sessions
  listMySessions: () =>
    request<{ sessions: Session[] }>("/api/sessions/me"),
  getSession: (id: string) =>
    request<{ session: Session }>(`/api/sessions/${encodeURIComponent(id)}`),
  listSessions: (filters: {
    coach?: string
    since?: string
    until?: string
    topic?: string
    limit?: number
    offset?: number
  } = {}) => {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== "") qs.set(k, String(v))
    }
    const suffix = qs.toString() ? `?${qs}` : ""
    return request<{
      sessions: Session[]
      total: number
      limit: number
      offset: number
    }>(`/api/sessions${suffix}`)
  },
  submitSession: (input: {
    draft: SessionDraft
    durationSeconds: number
  }) =>
    request<{ session: Session }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // Form schema
  getCurrentForm: () => request<{ form: FormVersion }>("/api/forms/current"),
  publishForm: (input: { schema: FormVersion["schema"] }) =>
    request<{ form: FormVersion }>("/api/forms/version", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listFormVersions: () =>
    request<{ versions: FormVersion[] }>("/api/forms/versions"),

  // Coaches
  listCoaches: () => request<{ coaches: Coach[] }>("/api/coaches"),
  inviteCoach: (input: { email: string; role: "coach" | "director" }) =>
    request<{
      coach: Coach
      invitation: { id: string; acceptUrl: string; expiresAt: string | null }
    }>("/api/coaches/invite", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // Invitations (public — invitation id is the secret)
  getInvitation: (id: string) =>
    request<{
      invitation: {
        id: string
        email: string
        role: "director" | "coach"
        organizationId: string
        organizationName: string
        expiresAt: string
      }
    }>(`/api/invitations/${encodeURIComponent(id)}`),

  // Director: re-fetch a pending invitation's share link
  getInviteLink: (id: string) =>
    request<{
      invitation: {
        id: string
        email: string
        acceptUrl: string
        expiresAt: string
      }
    }>(`/api/coaches/invitations/${encodeURIComponent(id)}`),

  cancelInvite: (id: string) =>
    request<{ ok: true }>(
      `/api/coaches/invitations/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),

  // Director: issue a one-time password reset link for a coach
  resetCoachPassword: (userId: string) =>
    request<{
      reset: { id: string; resetUrl: string; expiresAt: string }
    }>(
      `/api/coaches/${encodeURIComponent(userId)}/reset-password`,
      { method: "POST" },
    ),

  // Public reset link consumption
  getPasswordReset: (token: string) =>
    request<{
      reset: { email: string; name: string; expiresAt: string }
    }>(`/api/password-resets/${encodeURIComponent(token)}`),

  consumePasswordReset: (token: string, password: string) =>
    request<{ ok: true }>(`/api/password-resets/${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  // Aggregates
  getOverview: (params: { window?: "week" | "month" | "quarter" } = {}) =>
    request<AggregateOverview>(
      `/api/aggregates/overview${
        params.window ? `?window=${params.window}` : ""
      }`,
    ),
  getReport: (params: { window: "week" | "month" | "quarter" | "custom" }) =>
    request<ReportData>(`/api/aggregates/report?window=${params.window}`),

  getInsights: () =>
    request<{ source: "llm" | "fallback"; insights: string[] }>(
      "/api/aggregates/insights",
    ),
}

export { ApiError }
